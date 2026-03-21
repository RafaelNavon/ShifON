const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY name'
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id — update name, email, or password
router.put('/:id', async (req, res) => {
  const { name, email, password, role } = req.body;
  const isOwnProfile = req.user.id === parseInt(req.params.id);
  const isAdmin = req.user.role === 'admin';

  if (!isOwnProfile && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const updates = [];
    const params = [];

    if (name) { params.push(name); updates.push(`name = $${params.length}`); }
    if (email) { params.push(email); updates.push(`email = $${params.length}`); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      params.push(hash);
      updates.push(`password_hash = $${params.length}`);
    }
    if (role && isAdmin) { params.push(role); updates.push(`role = $${params.length}`); }

    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING id, name, email, role`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'User not found' });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
