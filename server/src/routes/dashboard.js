const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const [
      tasksResult,
      overdueResult,
      batchActivityResult,
      shipmentActivityResult,
      taskDoneActivityResult,
      taskCreatedActivityResult,
      todayStrawsResult,
      todayBullsResult,
    ] = await Promise.all([
      // Non-done tasks with creator and in-progress person
      pool.query(`
        SELECT t.id, t.title, t.status,
          TO_CHAR(t.due_date, 'YYYY-MM-DD') AS due_date,
          c.name AS created_by_name,
          u3.name AS in_progress_by_name
        FROM tasks t
        LEFT JOIN users c ON c.id = t.created_by
        LEFT JOIN users u3 ON u3.id = t.in_progress_by
        WHERE t.status != 'done'
        ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
      `),
      // Overdue count
      pool.query(`
        SELECT COUNT(*)::integer AS count FROM tasks
        WHERE status != 'done' AND due_date < CURRENT_DATE
      `),
      // Batch activity — daily_logs created today
      pool.query(`
        SELECT dl.created_at, u.name AS user_name,
          dl.quantity_produced, bu.name AS bull_name,
          c.name AS container_name, s.slot_number
        FROM daily_logs dl
        LEFT JOIN users u ON u.id = dl.recorded_by
        LEFT JOIN bulls bu ON bu.id = dl.bull_id
        LEFT JOIN slots s ON s.id = dl.slot_id
        LEFT JOIN containers c ON c.id = s.container_id
        WHERE dl.log_date = CURRENT_DATE
      `),
      // Shipment activity — shipments dated today, with total straw count
      pool.query(`
        SELECT sh.created_at, sh.destination, u.name AS user_name,
          COALESCE(SUM(si.quantity), 0)::integer AS total_quantity
        FROM shipments sh
        LEFT JOIN users u ON u.id = sh.created_by
        LEFT JOIN shipment_items si ON si.shipment_id = sh.id
        WHERE sh.shipment_date = CURRENT_DATE
        GROUP BY sh.id, sh.created_at, sh.destination, u.name
      `),
      // Tasks completed today
      pool.query(`
        SELECT t.completed_at AS timestamp, t.title, u.name AS user_name
        FROM tasks t
        LEFT JOIN users u ON u.id = t.completed_by
        WHERE t.status = 'done'
          AND t.completed_at >= CURRENT_DATE
          AND t.completed_at < CURRENT_DATE + INTERVAL '1 day'
      `),
      // Tasks created today
      pool.query(`
        SELECT t.created_at AS timestamp, t.title, u.name AS user_name
        FROM tasks t
        LEFT JOIN users u ON u.id = t.created_by
        WHERE t.created_at >= CURRENT_DATE
          AND t.created_at < CURRENT_DATE + INTERVAL '1 day'
      `),
      // Total straws produced today
      pool.query(`
        SELECT COALESCE(SUM(quantity_produced), 0)::integer AS total
        FROM daily_logs WHERE log_date = CURRENT_DATE
      `),
      // Distinct bulls worked today
      pool.query(`
        SELECT COUNT(DISTINCT bull_id)::integer AS count
        FROM daily_logs WHERE log_date = CURRENT_DATE
      `),
    ]);

    // Build unified activity feed
    const activity = [];

    for (const row of batchActivityResult.rows) {
      activity.push({
        type: 'batch',
        timestamp: row.created_at,
        message: `${row.user_name || 'Someone'} added ${row.quantity_produced} ${row.bull_name || '?'} straws to ${row.container_name || '?'} Slot ${row.slot_number}`,
      });
    }

    for (const row of shipmentActivityResult.rows) {
      activity.push({
        type: 'shipment',
        timestamp: row.created_at,
        message: `${row.user_name || 'Someone'} logged a shipment of ${row.total_quantity} straws to ${capitalize(row.destination)}`,
      });
    }

    for (const row of taskDoneActivityResult.rows) {
      activity.push({
        type: 'task_done',
        timestamp: row.timestamp,
        message: `${row.user_name || 'Someone'} completed: ${row.title}`,
      });
    }

    for (const row of taskCreatedActivityResult.rows) {
      activity.push({
        type: 'task_created',
        timestamp: row.timestamp,
        message: `${row.user_name || 'Someone'} created a task: ${row.title}`,
      });
    }

    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      tasks: tasksResult.rows,
      overdue_count: overdueResult.rows[0].count,
      activity: activity.slice(0, 20),
      today_straws: todayStrawsResult.rows[0].total,
      today_bulls: todayBullsResult.rows[0].count,
    });
  } catch (err) {
    console.error('Error in GET dashboard:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
