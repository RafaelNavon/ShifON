const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/bulls — list all bulls with total straw count and last batch date
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.*,
        COALESCE(SUM(ba.quantity), 0) AS total_straws,
        MAX(ba.production_date) AS last_batch_date
      FROM bulls b
      LEFT JOIN batches ba ON ba.bull_id = b.id
      GROUP BY b.id
      ORDER BY b.name
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error in GET all bulls:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/bulls/:id/batches — all current batches for a bull
router.get('/:id/batches', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ba.*,
        s.slot_number, s.position,
        c.name AS container_name
      FROM batches ba
      LEFT JOIN slots s ON s.id = ba.slot_id
      LEFT JOIN containers c ON c.id = s.container_id
      WHERE ba.bull_id = $1
      ORDER BY ba.created_at DESC`,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    console.error('Error in GET bull batches:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/bulls/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM bulls WHERE id = $1', [
      req.params.id,
    ]);
    if (!rows[0]) return res.status(404).json({ error: 'Bull not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error in GET bull by id:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/bulls
router.post('/', async (req, res) => {
  const { name, bull_code, breed, notes } = req.body;
  if (!name || !bull_code) {
    return res.status(400).json({ error: 'name and bull_code are required' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO bulls (name, bull_code, breed, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, bull_code, breed, notes],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'bull_code already exists' });
    console.error('Error in POST create bull:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/bulls/:id
router.put('/:id', async (req, res) => {
  const { name, bull_code, breed, notes } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE bulls SET
        name = COALESCE($1, name),
        bull_code = COALESCE($2, bull_code),
        breed = COALESCE($3, breed),
        notes = COALESCE($4, notes)
       WHERE id = $5 RETURNING *`,
      [name, bull_code, breed, notes, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Bull not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'bull_code already exists' });
    console.error('Error in PUT update bull:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/bulls/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM bulls WHERE id = $1', [
      req.params.id,
    ]);
    if (!rowCount) return res.status(404).json({ error: 'Bull not found' });
    res.status(204).end();
  } catch (err) {
    console.error('Error in DELETE bull:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
