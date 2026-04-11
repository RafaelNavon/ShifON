const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        t.id, t.title, t.description, t.assigned_to,
        t.created_by, t.completed_by, t.in_progress_by,
        t.status, t.created_at, t.completed_at,
        TO_CHAR(t.due_date, 'YYYY-MM-DD') AS due_date,
        c.name AS created_by_name,
        cb.name AS completed_by_name,
        u3.name AS in_progress_by_name
      FROM tasks t
      LEFT JOIN users c ON c.id = t.created_by
      LEFT JOIN users cb ON cb.id = t.completed_by
      LEFT JOIN users u3 ON u3.id = t.in_progress_by
      ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error in GET all tasks:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  const { title, description, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO tasks (title, description, created_by, due_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, description || null, req.user.id, due_date || null],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error in POST create task:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  const { title, description, status, due_date } = req.body;
  try {
    const { rows: [current] } = await pool.query(
      'SELECT status FROM tasks WHERE id = $1',
      [req.params.id],
    );
    if (!current) return res.status(404).json({ error: 'Task not found' });

    const newStatus = status ?? current.status;
    const goingDone = newStatus === 'done' && current.status !== 'done';
    const leavingDone = newStatus !== 'done' && current.status === 'done';
    const goingInProgress = newStatus === 'in_progress' && current.status !== 'in_progress';
    const leavingInProgress = newStatus !== 'in_progress' && current.status === 'in_progress';

    const { rows } = await pool.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        due_date = COALESCE($4, due_date),
        completed_by = CASE WHEN $5 THEN $6::integer WHEN $7 THEN NULL ELSE completed_by END,
        completed_at = CASE WHEN $5 THEN NOW() WHEN $7 THEN NULL ELSE completed_at END,
        in_progress_by = CASE WHEN $8 THEN $6::integer WHEN $9 THEN NULL ELSE in_progress_by END
       WHERE id = $10 RETURNING *`,
      [
        title || null,
        description || null,
        status || null,
        due_date || null,
        goingDone,
        req.user.id,
        leavingDone,
        goingInProgress,
        leavingInProgress,
        req.params.id,
      ],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error in PUT update task:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1', [
      req.params.id,
    ]);
    if (!rowCount) return res.status(404).json({ error: 'Task not found' });
    res.status(204).end();
  } catch (err) {
    console.error('Error in DELETE task:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
