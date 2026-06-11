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
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'shipment_items' ORDER BY ordinal_position",
    );
    console.log('Columns before:');
    console.log(before.rows);

    await client.query(
      `ALTER TABLE shipment_items
        ADD COLUMN override_by INTEGER REFERENCES users(id),
        ADD COLUMN override_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN original_status VARCHAR(40)`,
    );
    console.log('Added override_by, override_at, original_status columns');

    const after = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'shipment_items' ORDER BY ordinal_position",
    );
    console.log('Columns after:');
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
