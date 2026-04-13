const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/invite/create — admin only
router.post('/create', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO invites (token, created_by, expires_at) VALUES ($1, $2, $3)`,
      [token, req.user.id, expiresAt],
    );
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const link = `${baseUrl}/signup?token=${token}`;
    res.json({ link, expires_at: expiresAt });
  } catch (err) {
    console.error('Error in POST invite/create:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/invite/validate/:token
router.get('/validate/:token', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM invites WHERE token = $1`,
      [req.params.token],
    );
    const invite = rows[0];
    if (!invite || invite.used || new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ valid: false });
    }
    res.json({ valid: true });
  } catch (err) {
    console.error('Error in GET invite/validate:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/invite/signup
router.post('/signup', async (req, res) => {
  const { token, name, email, password, confirmPassword } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
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
      `SELECT * FROM invites WHERE token = $1 FOR UPDATE`,
      [token],
    );
    const invite = rows[0];
    if (!invite || invite.used || new Date(invite.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This invite link is invalid or has expired' });
    }

    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const bcrypt = require('bcrypt');
    console.log('[invite/signup] password length:', password.length);
    const password_hash = await bcrypt.hash(password, 10);
    console.log('[invite/signup] hash prefix:', password_hash.substring(0, 10));
    console.log('[invite/signup] saving email:', email.toLowerCase());
    await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'staff')`,
      [name.trim(), email.toLowerCase(), password_hash],
    );

    await client.query(`UPDATE invites SET used = true WHERE id = $1`, [invite.id]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Account created' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in POST invite/signup:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
