const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/shipments
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT sh.*,
        u.name AS created_by_name,
        json_agg(
          json_build_object(
            'id', si.id,
            'batch_id', si.batch_id,
            'quantity', si.quantity,
            'bull_name', bu.name,
            'bull_code', bu.bull_code
          )
        ) FILTER (WHERE si.id IS NOT NULL) AS items
      FROM shipments sh
      LEFT JOIN users u ON u.id = sh.created_by
      LEFT JOIN shipment_items si ON si.shipment_id = sh.id
      LEFT JOIN batches ba ON ba.id = si.batch_id
      LEFT JOIN bulls bu ON bu.id = ba.bull_id
      GROUP BY sh.id, u.name
      ORDER BY sh.shipment_date DESC
    `);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/shipments/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT sh.*,
        u.name AS created_by_name,
        json_agg(
          json_build_object(
            'id', si.id,
            'batch_id', si.batch_id,
            'quantity', si.quantity,
            'bull_name', bu.name,
            'bull_code', bu.bull_code
          )
        ) FILTER (WHERE si.id IS NOT NULL) AS items
      FROM shipments sh
      LEFT JOIN users u ON u.id = sh.created_by
      LEFT JOIN shipment_items si ON si.shipment_id = sh.id
      LEFT JOIN batches ba ON ba.id = si.batch_id
      LEFT JOIN bulls bu ON bu.id = ba.bull_id
      WHERE sh.id = $1
      GROUP BY sh.id, u.name
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Shipment not found' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/shipments — creates shipment and auto-subtracts from batch quantities
router.post('/', async (req, res) => {
  const { destination, shipment_date, notes, items } = req.body;
  // items: [{ batch_id, quantity }]
  if (!destination || !shipment_date || !items?.length) {
    return res.status(400).json({ error: 'destination, shipment_date, and items are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [shipment] } = await client.query(
      'INSERT INTO shipments (destination, shipment_date, notes, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [destination, shipment_date, notes, req.user.id]
    );

    for (const item of items) {
      // Verify sufficient stock
      const { rows: [batch] } = await client.query(
        'SELECT quantity FROM batches WHERE id = $1 FOR UPDATE',
        [item.batch_id]
      );
      if (!batch) throw { status: 404, message: `Batch ${item.batch_id} not found` };
      if (batch.quantity < item.quantity) {
        throw { status: 400, message: `Insufficient quantity in batch ${item.batch_id}` };
      }

      await client.query(
        'INSERT INTO shipment_items (shipment_id, batch_id, quantity) VALUES ($1, $2, $3)',
        [shipment.id, item.batch_id, item.quantity]
      );

      await client.query(
        'UPDATE batches SET quantity = quantity - $1 WHERE id = $2',
        [item.quantity, item.batch_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(shipment);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE /api/shipments/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM shipments WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Shipment not found' });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
