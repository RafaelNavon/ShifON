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

    const before = await client.query('SELECT status, COUNT(*) FROM batches GROUP BY status');
    console.log('Before:');
    console.log(before.rows);

    await client.query('ALTER TABLE batches DROP CONSTRAINT batches_status_check');
    console.log('Dropped old constraint');

    const migrated = await client.query(
      "UPDATE batches SET status = 'skew_ptm' WHERE status = 'skew' RETURNING id",
    );
    console.log(`Migrated ${migrated.rowCount} rows from skew to skew_ptm`);

    await client.query(
      `ALTER TABLE batches ADD CONSTRAINT batches_status_check CHECK (
        status IN ('approved', 'skew_ptm', 'skew', 'disqualified', 'bacterial_contamination', 'c_ptb', 'ptm', 'reext', 'awaiting_response')
      )`,
    );
    console.log('Added new constraint with 9 allowed values');

    await client.query("ALTER TABLE batches ALTER COLUMN status SET DEFAULT 'skew_ptm'");
    console.log('Changed default to skew_ptm');

    const after = await client.query('SELECT status, COUNT(*) FROM batches GROUP BY status');
    console.log('After:');
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
