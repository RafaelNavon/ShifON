const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/containers — full inventory view
router.get('/', async (req, res) => {
  try {
    const { rows: containers } = await pool.query('SELECT * FROM containers ORDER BY id');

    const { rows: slots } = await pool.query(`
      SELECT s.*,
        ba.id AS batch_id, ba.quantity, ba.sio_batch_code, ba.production_date, ba.status,
        bu.name AS bull_name, bu.bull_code
      FROM slots s
      LEFT JOIN batches ba ON ba.slot_id = s.id
      LEFT JOIN bulls bu ON bu.id = ba.bull_id
      ORDER BY s.container_id, s.slot_number, s.position
    `);

    const result = containers.map((c) => ({
      ...c,
      slots: slots
        .filter((s) => s.container_id === c.id)
        .map((s) => ({
          id: s.id,
          slot_number: s.slot_number,
          position: s.position,
          batch: s.batch_id
            ? {
                id: s.batch_id,
                quantity: s.quantity,
                sio_batch_code: s.sio_batch_code,
                production_date: s.production_date,
                status: s.status,
                bull_name: s.bull_name,
                bull_code: s.bull_code,
              }
            : null,
        })),
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
