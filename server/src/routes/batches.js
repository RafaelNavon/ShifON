const express = require("express");
const pool = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// GET /api/batches
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ba.*,
        bu.name AS bull_name, bu.bull_code,
        s.slot_number, s.position,
        c.name AS container_name
      FROM batches ba
      LEFT JOIN bulls bu ON bu.id = ba.bull_id
      LEFT JOIN slots s ON s.id = ba.slot_id
      LEFT JOIN containers c ON c.id = s.container_id
      ORDER BY ba.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error in GET all batches:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/batches/:id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT ba.*,
        bu.name AS bull_name, bu.bull_code,
        s.slot_number, s.position,
        c.name AS container_name
      FROM batches ba
      LEFT JOIN bulls bu ON bu.id = ba.bull_id
      LEFT JOIN slots s ON s.id = ba.slot_id
      LEFT JOIN containers c ON c.id = s.container_id
      WHERE ba.id = $1
    `,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: "Batch not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error in GET batch by id:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/batches
router.post("/", async (req, res) => {
  const {
    bull_id,
    slot_id,
    quantity,
    sio_batch_code,
    production_date,
    status,
  } = req.body;
  if (!bull_id || !slot_id || quantity == null) {
    return res
      .status(400)
      .json({ error: "bull_id, slot_id, and quantity are required" });
  }
  try {
    // Ensure slot is not already occupied
    const { rows: existing } = await pool.query(
      "SELECT id FROM batches WHERE slot_id = $1",
      [slot_id],
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Slot is already occupied" });
    }
    const { rows } = await pool.query(
      `INSERT INTO batches (bull_id, slot_id, quantity, sio_batch_code, production_date, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        bull_id,
        slot_id,
        quantity,
        sio_batch_code,
        production_date,
        status || "approved",
      ],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error in POST create batch:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/batches/:id
router.put("/:id", async (req, res) => {
  const { quantity, sio_batch_code, production_date, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE batches SET
        quantity = COALESCE($1, quantity),
        sio_batch_code = COALESCE($2, sio_batch_code),
        production_date = COALESCE($3, production_date),
        status = COALESCE($4, status)
       WHERE id = $5 RETURNING *`,
      [quantity, sio_batch_code, production_date, status, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: "Batch not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error in PUT update batch:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/batches/:id
router.delete("/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM batches WHERE id = $1", [
      req.params.id,
    ]);
    if (!rowCount) return res.status(404).json({ error: "Batch not found" });
    res.status(204).end();
  } catch (err) {
    console.error("Error in DELETE batch:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
