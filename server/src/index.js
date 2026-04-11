require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const authRoutes = require('./routes/auth');
const bullRoutes = require('./routes/bulls');
const containerRoutes = require('./routes/containers');
const batchRoutes = require('./routes/batches');
const shipmentRoutes = require('./routes/shipments');
const dailyLogRoutes = require('./routes/daily_logs');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/bulls', bullRoutes);
app.use('/api/containers', containerRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/daily-logs', dailyLogRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

async function cleanupDoneTasks() {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM tasks WHERE status = 'done' AND completed_at < NOW() - INTERVAL '7 days'",
    );
    if (rowCount) console.log(`Cleaned up ${rowCount} expired done task(s).`);
  } catch (err) {
    console.error('Error in cleanupDoneTasks:', err);
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ShifON server running on port ${PORT}`);
  cleanupDoneTasks();
  setInterval(cleanupDoneTasks, 24 * 60 * 60 * 1000);
});
