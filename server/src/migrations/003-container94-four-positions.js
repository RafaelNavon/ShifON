require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await client.query('BEGIN');

    const before = await client.query('SELECT COUNT(*) FROM slots WHERE container_id = 5');
    console.log(`Container 94 slots before: ${before.rows[0].count}`);

    const safetyCheck = await client.query(
      `SELECT COUNT(*) AS batch_count FROM batches b JOIN slots s ON s.id = b.slot_id WHERE s.container_id = 5`,
    );
    if (parseInt(safetyCheck.rows[0].batch_count, 10) > 0) {
      throw new Error('ABORT: Container 94 has batches, migration not safe');
    }
    console.log('Safety check passed: no batches in Container 94');

    await client.query('ALTER TABLE slots DROP CONSTRAINT slots_position_check');
    console.log('Dropped old position constraint');

    await client.query('ALTER TABLE slots ALTER COLUMN position TYPE VARCHAR(10)');
    console.log('Widened position column to VARCHAR(10)');

    const deleted = await client.query('DELETE FROM slots WHERE container_id = 5');
    console.log(`Deleted ${deleted.rowCount} old Container 94 slots`);

    await client.query(
      `INSERT INTO slots (container_id, slot_number, position) VALUES
        (5, 1, 'UP_1'), (5, 1, 'UP_2'), (5, 1, 'DOWN_1'), (5, 1, 'DOWN_2'),
        (5, 2, 'UP_1'), (5, 2, 'UP_2'), (5, 2, 'DOWN_1'), (5, 2, 'DOWN_2'),
        (5, 3, 'UP_1'), (5, 3, 'UP_2'), (5, 3, 'DOWN_1'), (5, 3, 'DOWN_2'),
        (5, 4, 'UP_1'), (5, 4, 'UP_2'), (5, 4, 'DOWN_1'), (5, 4, 'DOWN_2'),
        (5, 5, 'UP_1'), (5, 5, 'UP_2'), (5, 5, 'DOWN_1'), (5, 5, 'DOWN_2'),
        (5, 6, 'UP_1'), (5, 6, 'UP_2'), (5, 6, 'DOWN_1'), (5, 6, 'DOWN_2'),
        (5, 7, 'UP_1'), (5, 7, 'UP_2'), (5, 7, 'DOWN_1'), (5, 7, 'DOWN_2'),
        (5, 8, 'UP_1'), (5, 8, 'UP_2'), (5, 8, 'DOWN_1'), (5, 8, 'DOWN_2'),
        (5, 9, 'UP_1'), (5, 9, 'UP_2'), (5, 9, 'DOWN_1'), (5, 9, 'DOWN_2'),
        (5, 10, 'UP_1'), (5, 10, 'UP_2'), (5, 10, 'DOWN_1'), (5, 10, 'DOWN_2')`,
    );
    console.log('Inserted 40 new slots (10 slots x 4 positions)');

    await client.query(
      `ALTER TABLE slots ADD CONSTRAINT slots_position_check CHECK (position IN ('UP', 'DOWN', 'UP_1', 'UP_2', 'DOWN_1', 'DOWN_2'))`,
    );
    console.log('Added new position constraint with 6 allowed values');

    const after = await client.query(
      `SELECT slot_number, position FROM slots WHERE container_id = 5 ORDER BY slot_number, position`,
    );
    console.log('After:');
    console.log(`${after.rowCount} rows`);
    console.log(after.rows);

    await client.query('COMMIT');
    console.log('Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    await client.end();
    process.exit(1);
  }

  await client.end();
  process.exit(0);
}

run();
