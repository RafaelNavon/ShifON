const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Weeks start on Monday (Postgres date_trunc('week')), in the DB session's timezone.
const WEEK_START_SQL = `date_trunc('week', CURRENT_DATE)::date`;

// One duty (or all duties) with this week's claim status
async function getDutyStatus(weekStart, dutyId = null) {
  const { rows } = await pool.query(
    `SELECT d.id, d.name, d.day_of_week,
       TO_CHAR($1::date, 'YYYY-MM-DD') AS week_start,
       dc.claimed_by, dc.claimed_at,
       u.name AS claimed_by_name
     FROM duties d
     LEFT JOIN duty_claims dc ON dc.duty_id = d.id AND dc.week_start = $1::date
     LEFT JOIN users u ON u.id = dc.claimed_by
     WHERE $2::integer IS NULL OR d.id = $2::integer
     ORDER BY d.day_of_week, d.name`,
    [weekStart, dutyId],
  );
  return rows;
}

// Resolves the duty and fixes "this week" once, so every statement in a
// request agrees on the week even if it runs across Monday midnight.
async function findDutyWeek(dutyId) {
  const { rows } = await pool.query(
    `SELECT id, TO_CHAR(${WEEK_START_SQL}, 'YYYY-MM-DD') AS week_start
     FROM duties WHERE id = $1`,
    [dutyId],
  );
  return rows[0];
}

// GET /api/duties
router.get('/', async (req, res) => {
  try {
    const { rows: [{ week_start }] } = await pool.query(
      `SELECT TO_CHAR(${WEEK_START_SQL}, 'YYYY-MM-DD') AS week_start`,
    );
    res.json(await getDutyStatus(week_start));
  } catch (err) {
    console.error('Error in GET duties:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/duties/:id/claim
router.post('/:id/claim', async (req, res) => {
  try {
    const duty = await findDutyWeek(req.params.id);
    if (!duty) return res.status(404).json({ error: 'Duty not found' });

    // Make sure this week's row exists (unclaimed). If it already exists, no-op.
    await pool.query(
      `INSERT INTO duty_claims (duty_id, week_start) VALUES ($1, $2)
       ON CONFLICT (duty_id, week_start) DO NOTHING`,
      [duty.id, duty.week_start],
    );

    // The claim itself: only succeeds while nobody holds it.
    const { rowCount } = await pool.query(
      `UPDATE duty_claims SET claimed_by = $3, claimed_at = NOW()
       WHERE duty_id = $1 AND week_start = $2 AND claimed_by IS NULL`,
      [duty.id, duty.week_start, req.user.id],
    );

    const [status] = await getDutyStatus(duty.week_start, duty.id);
    if (!rowCount && status.claimed_by !== req.user.id) {
      return res.status(409).json({
        error: `Already taken by ${status.claimed_by_name || 'someone else'}`,
        duty: status,
      });
    }
    res.json(status);
  } catch (err) {
    console.error('Error in POST claim duty:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/duties/:id/cancel
router.post('/:id/cancel', async (req, res) => {
  try {
    const duty = await findDutyWeek(req.params.id);
    if (!duty) return res.status(404).json({ error: 'Duty not found' });

    const { rowCount } = await pool.query(
      `UPDATE duty_claims SET claimed_by = NULL, claimed_at = NULL
       WHERE duty_id = $1 AND week_start = $2 AND claimed_by = $3`,
      [duty.id, duty.week_start, req.user.id],
    );

    const [status] = await getDutyStatus(duty.week_start, duty.id);
    if (!rowCount) {
      return status.claimed_by
        ? res.status(403).json({ error: 'Only the person who claimed it can cancel', duty: status })
        : res.status(409).json({ error: 'Nobody has claimed this duty', duty: status });
    }
    res.json(status);
  } catch (err) {
    console.error('Error in POST cancel duty:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
