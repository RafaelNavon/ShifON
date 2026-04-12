const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { sendPasswordResetEmail } = require('../utils/mailer');

const router = express.Router();

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  // Always respond the same way — don't reveal if email exists
  const genericResponse = res.json({ message: 'If this email exists, a reset link has been sent' });

  if (!email) return genericResponse;

  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!rows[0]) return genericResponse;

    const userId = rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [userId, token, expiresAt],
    );

    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail(email.toLowerCase(), resetLink);
  } catch (err) {
    console.error('Error in POST forgot-password:', err);
    // Still return generic response — don't leak errors to client
  }

  return genericResponse;
});

// GET /api/auth/reset-password/:token
router.get('/reset-password/:token', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM password_reset_tokens WHERE token = $1`,
      [req.params.token],
    );
    const record = rows[0];
    if (!record || record.used || new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ valid: false });
    }
    res.json({ valid: true });
  } catch (err) {
    console.error('Error in GET reset-password/:token:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT * FROM password_reset_tokens WHERE token = $1 FOR UPDATE`,
      [token],
    );
    const record = rows[0];
    if (!record || record.used || new Date(record.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This reset link is invalid or has expired' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, record.user_id]);
    await client.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [record.id]);

    await client.query('COMMIT');
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in POST reset-password:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
