const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*,
        a.name AS assigned_to_name,
        c.name AS created_by_name
      FROM tasks t
      LEFT JOIN users a ON a.id = t.assigned_to
      LEFT JOIN users c ON c.id = t.created_by
      ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
    `);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  const { title, description, assigned_to, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO tasks (title, description, assigned_to, created_by, due_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, description, assigned_to, req.user.id, due_date]
    );
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  const { title, description, assigned_to, status, due_date } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        assigned_to = COALESCE($3, assigned_to),
        status = COALESCE($4, status),
        due_date = COALESCE($5, due_date)
       WHERE id = $6 RETURNING *`,
      [title, description, assigned_to, status, due_date, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Task not found' });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
