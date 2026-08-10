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

    const before = await client.query(
      `SELECT c.id, c.name, COUNT(s.id) AS slot_count
       FROM containers c
       LEFT JOIN slots s ON s.container_id = c.id
       GROUP BY c.id, c.name
       ORDER BY c.id`,
    );
    console.log('Containers before:');
    console.log(before.rows);

    const safetyCheck = await client.query(
      `SELECT COUNT(*) AS container_count FROM containers WHERE name = 'Container 95'`,
    );
    if (parseInt(safetyCheck.rows[0].container_count, 10) > 0) {
      throw new Error('ABORT: Container 95 already exists, migration already applied');
    }
    console.log('Safety check passed: Container 95 does not exist yet');

    await client.query('ALTER TABLE containers ADD COLUMN IF NOT EXISTS sort_order INTEGER');
    console.log('Added sort_order column to containers');

    const backfilled = await client.query(
      `UPDATE containers SET sort_order = CASE name
        WHEN 'Container 91' THEN 1
        WHEN 'Container 92' THEN 2
        WHEN 'Container 93' THEN 3
        WHEN 'Container 95' THEN 4
        WHEN 'Container 94' THEN 5
       END
       WHERE name IN ('Container 91', 'Container 92', 'Container 93', 'Container 94', 'Container 95')`,
    );
    console.log(`Backfilled sort_order for ${backfilled.rowCount} containers (display order 91, 92, 93, 95, 94)`);

    const inserted = await client.query(
      `INSERT INTO containers (name, sort_order) VALUES ('Container 95', 4) RETURNING id`,
    );
    const containerId = inserted.rows[0].id;
    console.log(`Inserted Container 95 with id ${containerId}`);

    const slots = await client.query(
      `INSERT INTO slots (container_id, slot_number, position) VALUES
        ($1, 1, 'UP'), ($1, 1, 'DOWN'),
        ($1, 2, 'UP'), ($1, 2, 'DOWN'),
        ($1, 3, 'UP'), ($1, 3, 'DOWN'),
        ($1, 4, 'UP'), ($1, 4, 'DOWN'),
        ($1, 5, 'UP'), ($1, 5, 'DOWN'),
        ($1, 6, 'UP'), ($1, 6, 'DOWN')`,
      [containerId],
    );
    console.log(`Inserted ${slots.rowCount} slots for Container 95 (6 slots x 2 positions)`);

    const after = await client.query(
      `SELECT c.id, c.name, c.sort_order, COUNT(s.id) AS slot_count
       FROM containers c
       LEFT JOIN slots s ON s.container_id = c.id
       GROUP BY c.id, c.name, c.sort_order
       ORDER BY c.sort_order, c.id`,
    );
    console.log('Containers after:');
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
