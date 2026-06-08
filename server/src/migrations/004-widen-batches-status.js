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
      "SELECT character_maximum_length FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'status'",
    );
    console.log(`Current status column max length: ${before.rows[0].character_maximum_length}`);

    await client.query('ALTER TABLE batches ALTER COLUMN status TYPE VARCHAR(40)');
    console.log('Widened batches.status to VARCHAR(40)');

    const after = await client.query(
      "SELECT character_maximum_length FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'status'",
    );
    console.log(`New status column max length: ${after.rows[0].character_maximum_length}`);

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
