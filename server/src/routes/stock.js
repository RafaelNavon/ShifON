const express = require('express');
const pool = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/stock
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        si.id, si.name, si.company, si.barcode, si.display_order,
        sc.unit_type, sc.quantity, sc.is_full, sc.notes,
        sc.counted_by, sc.counted_at,
        u.name AS counted_by_name
      FROM stock_items si
      LEFT JOIN stock_counts sc ON sc.stock_item_id = si.id
      LEFT JOIN users u ON u.id = sc.counted_by
      ORDER BY si.display_order ASC
    `);
    const items = rows.map(row => ({
      id: row.id,
      name: row.name,
      company: row.company,
      barcode: row.barcode,
      display_order: row.display_order,
      count: row.unit_type !== null ? {
        unit_type: row.unit_type,
        quantity: row.quantity,
        is_full: row.is_full,
        notes: row.notes,
        counted_at: row.counted_at,
        counted_by: row.counted_by,
        counted_by_name: row.counted_by_name,
      } : null,
    }));
    res.json(items);
  } catch (err) {
    console.error('Error in GET all stock:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/stock/:itemId/count
router.put('/:itemId/count', async (req, res) => {
  const { itemId } = req.params;
  let { unit_type, quantity, is_full, notes } = req.body;

  if (!['units', 'boxes'].includes(unit_type)) {
    return res.status(400).json({ error: 'unit_type must be "units" or "boxes"' });
  }
  if (is_full === undefined || is_full === null) {
    is_full = false;
  } else if (typeof is_full !== 'boolean') {
    return res.status(400).json({ error: 'is_full must be a boolean' });
  }
  if (quantity !== undefined && quantity !== null) {
    if (!Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'quantity must be a non-negative integer or null' });
    }
  } else {
    quantity = null;
  }
  if (quantity === null && !is_full) {
    return res.status(400).json({ error: 'At least one of quantity or is_full must be provided' });
  }
  notes = notes || null;

  try {
    const { rowCount } = await pool.query(
      'SELECT 1 FROM stock_items WHERE id = $1',
      [itemId],
    );
    if (!rowCount) return res.status(404).json({ error: 'Stock item not found' });

    const { rows } = await pool.query(
      `INSERT INTO stock_counts (stock_item_id, unit_type, quantity, is_full, notes, counted_by, counted_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (stock_item_id) DO UPDATE SET
         unit_type = EXCLUDED.unit_type,
         quantity = EXCLUDED.quantity,
         is_full = EXCLUDED.is_full,
         notes = EXCLUDED.notes,
         counted_by = EXCLUDED.counted_by,
         counted_at = EXCLUDED.counted_at
       RETURNING *`,
      [itemId, unit_type, quantity, is_full, notes, req.user.id],
    );
    const count = rows[0];

    const { rows: userRows } = await pool.query(
      'SELECT name FROM users WHERE id = $1',
      [count.counted_by],
    );
    count.counted_by_name = userRows[0]?.name ?? null;

    res.json(count);
  } catch (err) {
    console.error('Error in PUT stock count:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/stock/items — admin only
router.post('/items', requireAdmin, async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name is required' });
  const company = req.body.company || null;
  const barcode = req.body.barcode || null;

  try {
    const { rows } = await pool.query(
      `INSERT INTO stock_items (name, company, barcode, display_order)
       VALUES ($1, $2, $3, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM stock_items))
       RETURNING *`,
      [name, company, barcode],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error in POST stock item:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/stock/items/:id — admin only
router.patch('/items/:id', requireAdmin, async (req, res) => {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if ('name' in req.body) {
    const trimmed = (req.body.name || '').trim();
    if (!trimmed) return res.status(400).json({ error: 'name must be a non-empty string' });
    updates.push(`name = $${paramIndex++}`);
    values.push(trimmed);
  }
  if ('company' in req.body) {
    updates.push(`company = $${paramIndex++}`);
    values.push(req.body.company || null);
  }
  if ('barcode' in req.body) {
    updates.push(`barcode = $${paramIndex++}`);
    values.push(req.body.barcode || null);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(req.params.id);
  const sql = `UPDATE stock_items SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

  try {
    const { rows } = await pool.query(sql, values);
    if (!rows[0]) return res.status(404).json({ error: 'Stock item not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error in PATCH stock item:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/stock/items/:id — admin only
router.delete('/items/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM stock_items WHERE id = $1',
      [req.params.id],
    );
    if (!rowCount) return res.status(404).json({ error: 'Stock item not found' });
    res.status(204).end();
  } catch (err) {
    console.error('Error in DELETE stock item:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
