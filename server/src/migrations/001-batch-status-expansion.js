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
    console.log('Status counts before migration:');
    console.log(before.rows);

    const updated = await client.query(
      "UPDATE batches SET status = 'skew_ptm' WHERE status = 'skew' RETURNING id",
    );
    console.log(`Updated ${updated.rowCount} row(s) from 'skew' to 'skew_ptm'`);

    const after = await client.query('SELECT status, COUNT(*) FROM batches GROUP BY status');
    console.log('Status counts after migration:');
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
