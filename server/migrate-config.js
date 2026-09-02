/**
 * node-pg-migrate configuration.
 *
 * Everything here is resolved from __dirname (server/), never from the current
 * working directory, so `npm run migrate:up` targets the same database and the
 * same migrations folder no matter where it is invoked from.
 *
 * Precedence for DATABASE_URL:
 *   - server/.env wins when the file exists (local development)
 *   - the real environment is used when it does not (Docker / production)
 * If both exist and disagree, we throw instead of silently picking one.
 */

const fs = require('node:fs');
const path = require('node:path');

const envPath = path.join(__dirname, '.env');

// Whatever node-pg-migrate already resolved before this config was loaded:
// either a real environment variable or a .env picked up from the cwd.
const preexistingUrl = process.env.DATABASE_URL;

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath, override: true });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    `DATABASE_URL is not set. Expected it in ${envPath} or in the environment.`
  );
}

if (preexistingUrl && preexistingUrl !== databaseUrl) {
  throw new Error(
    'Refusing to run: DATABASE_URL from the environment (or a .env picked up ' +
      `from the current directory) does not match the one in ${envPath}. ` +
      'Unset one of them so it is unambiguous which database is targeted.'
  );
}

module.exports = {
  url: databaseUrl,
  'migrations-dir': path.join(__dirname, 'migrations'),
};
