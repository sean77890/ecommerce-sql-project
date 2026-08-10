const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env and fill in your Postgres connection string.'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

async function initSchema() {
  await pool.query(fs.readFileSync(SCHEMA_PATH, 'utf8'));
}

module.exports = { pool, initSchema };
