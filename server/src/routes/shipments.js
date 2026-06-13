const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const OVERRIDABLE_STATUSES = ['skew', 'skew_ptm', 'ptm', 'awaiting_response'];

const SHIPMENT_BASE = `
  SELECT sh.*,
    u.name AS created_by_name,
    json_agg(
      json_build_object(
        'id', si.id,
        'batch_id', si.batch_id,
        'quantity', si.quantity,
        'bull_name', bu.name,
        'bull_code', bu.bull_code,
        'sio_batch_code', ba.sio_batch_code,
        'container_name', c.name,
        'slot_number', s.slot_number,
        'position', s.position
      )
    ) FILTER (WHERE si.id IS NOT NULL) AS items
  FROM shipments sh
  LEFT JOIN users u ON u.id = sh.created_by
  LEFT JOIN shipment_items si ON si.shipment_id = sh.id
  LEFT JOIN batches ba ON ba.id = si.batch_id
  LEFT JOIN bulls bu ON bu.id = ba.bull_id
  LEFT JOIN slots s ON s.id = ba.slot_id
  LEFT JOIN containers c ON c.id = s.container_id
`;

// GET /api/shipments
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      SHIPMENT_BASE + 'GROUP BY sh.id, u.name ORDER BY sh.shipment_date DESC',
    );
    res.json(rows);
  } catch (err) {
    console.error('Error in GET all shipments:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/shipments/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      SHIPMENT_BASE + 'WHERE sh.id = $1 GROUP BY sh.id, u.name',
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Shipment not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error in GET shipment by id:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/shipments — creates shipment and auto-subtracts from batch quantities
router.post('/', async (req, res) => {
  const { destination, shipment_date, notes, items } = req.body;
  if (!destination || !shipment_date || !items?.length) {
    return res.status(400).json({ error: 'destination, shipment_date, and items are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Sum requested quantities per batch_id (multiple items may reference the same batch)
    const totals = {};
    for (const item of items) {
      if (!item.batch_id || !item.quantity) continue;
      totals[item.batch_id] = (totals[item.batch_id] || 0) + Number(item.quantity);
    }

    // Lock all referenced batches and verify each has enough total available
    const batchIds = Object.keys(totals).map(Number);
    if (batchIds.length === 0) {
      throw { status: 400, message: 'No valid items provided' };
    }
    const { rows: batchRows } = await client.query(
      'SELECT id, quantity, status FROM batches WHERE id = ANY($1::int[]) FOR UPDATE',
      [batchIds],
    );
    const batchMap = new Map(batchRows.map((b) => [b.id, b]));

    // Build a map of which batches were requested as manager overrides.
    // Multiple items may reference the same batch; any override=true marks the whole batch.
    const overrideRequested = {};
    for (const item of items) {
      if (item.override === true) overrideRequested[item.batch_id] = true;
    }

    for (const id of batchIds) {
      const batch = batchMap.get(id);
      if (!batch) throw { status: 404, message: `Batch ${id} not found` };
      if (batch.status !== 'approved') {
        if (!OVERRIDABLE_STATUSES.includes(batch.status)) {
          throw { status: 400, message: `Batch ${id} has status '${batch.status}' and cannot be shipped` };
        }
        if (!overrideRequested[id]) {
          throw { status: 400, message: `Batch ${id} is not approved (status: ${batch.status}). Manager override required.` };
        }
      }
      if (totals[id] > batch.quantity) {
        throw {
          status: 400,
          message: `Insufficient quantity in batch ${id} — requested ${totals[id]}, available ${batch.quantity}`,
        };
      }
    }

    const { rows: [shipment] } = await client.query(
      'INSERT INTO shipments (destination, shipment_date, notes, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [destination, shipment_date, notes, req.user.id],
    );

    for (const item of items) {
      const { rows: [batch] } = await client.query(
        'SELECT id, quantity, status FROM batches WHERE id = $1 FOR UPDATE',
        [item.batch_id],
      );
      if (!batch) throw { status: 404, message: `Batch ${item.batch_id} not found` };
      if (batch.status !== 'approved') {
        if (!OVERRIDABLE_STATUSES.includes(batch.status)) {
          throw { status: 400, message: `Batch ${item.batch_id} has status '${batch.status}' and cannot be shipped` };
        }
        if (item.override !== true) {
          throw { status: 400, message: `Batch ${item.batch_id} is not approved (status: ${batch.status}). Manager override required.` };
        }
      }
      if (batch.quantity < item.quantity) {
        throw { status: 400, message: `Insufficient quantity in batch ${item.batch_id}` };
      }

      const batchForItem = batchMap.get(item.batch_id);
      const isOverride =
        item.override === true &&
        batchForItem &&
        batchForItem.status !== 'approved' &&
        OVERRIDABLE_STATUSES.includes(batchForItem.status);
      await client.query(
        `INSERT INTO shipment_items
          (shipment_id, batch_id, quantity, override_by, override_at, original_status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          shipment.id,
          item.batch_id,
          item.quantity,
          isOverride ? req.user.id : null,
          isOverride ? new Date() : null,
          isOverride ? batchForItem.status : null,
        ],
      );

      const newQty = batch.quantity - item.quantity;
      if (newQty === 0) {
        await client.query('DELETE FROM batches WHERE id = $1', [item.batch_id]);
      } else {
        await client.query(
          'UPDATE batches SET quantity = $1 WHERE id = $2',
          [newQty, item.batch_id],
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(shipment);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error in POST create shipment:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE /api/shipments/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM shipments WHERE id = $1',
      [req.params.id],
    );
    if (!rowCount) return res.status(404).json({ error: 'Shipment not found' });
    res.status(204).end();
  } catch (err) {
    console.error('Error in DELETE shipment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
