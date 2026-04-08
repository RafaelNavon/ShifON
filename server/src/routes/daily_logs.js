const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/daily-logs?date=YYYY-MM-DD&bull_id=1
router.get('/', async (req, res) => {
  const { date, bull_id } = req.query;
  try {
    let query = `
      SELECT dl.*,
        bu.name AS bull_name, bu.bull_code,
        s.slot_number, s.position,
        c.name AS container_name,
        u.name AS recorded_by_name
      FROM daily_logs dl
      LEFT JOIN bulls bu ON bu.id = dl.bull_id
      LEFT JOIN slots s ON s.id = dl.slot_id
      LEFT JOIN containers c ON c.id = s.container_id
      LEFT JOIN users u ON u.id = dl.recorded_by
      WHERE 1=1
    `;
    const params = [];
    if (date) {
      params.push(date);
      query += ` AND dl.log_date = $${params.length}`;
    }
    if (bull_id) {
      params.push(bull_id);
      query += ` AND dl.bull_id = $${params.length}`;
    }
    query += ' ORDER BY dl.log_date DESC, dl.created_at DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error in GET daily logs:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/daily-logs
router.post('/', async (req, res) => {
  const { bull_id, slot_id, quantity_produced, log_date, notes } = req.body;
  if (!bull_id || !slot_id || quantity_produced == null || !log_date) {
    return res.status(400).json({ error: 'bull_id, slot_id, quantity_produced, and log_date are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO daily_logs (bull_id, slot_id, quantity_produced, log_date, recorded_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [bull_id, slot_id, quantity_produced, log_date, req.user.id, notes],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error in POST create daily log:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/daily-logs/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM daily_logs WHERE id = $1',
      [req.params.id],
    );
    if (!rowCount) return res.status(404).json({ error: 'Log not found' });
    res.status(204).end();
  } catch (err) {
    console.error('Error in DELETE daily log:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
