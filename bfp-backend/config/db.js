// config/db.js
const { Pool } = require('pg');
require('dotenv').config();

let pool;
const MANAGED_DB_HOST_PATTERN = /render\.com|railway\.app|rlwy\.net|pooler\.supabase\.com|supabase\.co/;

function resolveIpFamily() {
  const configured = Number(process.env.DB_IP_FAMILY);
  if (configured === 4 || configured === 6) return configured;
  // Managed cloud DB endpoints often resolve to IPv6 first; some hosts/environments
  // (including certain Render network paths) cannot route IPv6 reliably.
  return 4;
}

const ipFamily = resolveIpFamily();

// If a canonical DATABASE_URL is present (e.g., Render), use it. Otherwise, construct one
// from individual DB_* env vars so both modes are supported.
let connectionString = process.env.DATABASE_URL;
if (!connectionString && process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER) {
  const user = encodeURIComponent(process.env.DB_USER);
  const pass = process.env.DB_PASSWORD ? encodeURIComponent(process.env.DB_PASSWORD) : '';
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || '5432';
  const name = process.env.DB_NAME;
  // Build a basic connection string from individual DB_* vars.
  // Do NOT force `sslmode=require` for local development. Only append it when
  // DB_SSL is explicitly true or the host looks like a managed provider.
  connectionString = `postgresql://${user}:${pass}@${host}:${port}/${name}`;
  const hostLooksLikeManagedFromEnv = MANAGED_DB_HOST_PATTERN.test(host);
  if (process.env.DB_SSL === 'true' || hostLooksLikeManagedFromEnv) {
    connectionString += '?sslmode=require';
  }
}

if (connectionString) {
  pool = new Pool({
    connectionString,
    // Keep IPv4 preference in all modes. In DATABASE_URL mode, pg derives TLS
    // behavior from URL params such as `sslmode`/`uselibpqcompat`.
    family: ipFamily,
  });
} else {
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'bfpmapping',
    // coerce password to string to avoid non-string types causing SASL errors
    password: process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : '',
    port: Number.isFinite(Number(process.env.DB_PORT)) ? parseInt(process.env.DB_PORT, 10) : 5432,
    // For DB_* mode only, derive SSL defaults from env/host hints.
    ssl: (
      process.env.DB_SSL === 'true' ||
      (process.env.DB_HOST && MANAGED_DB_HOST_PATTERN.test(process.env.DB_HOST))
    ) ? { rejectUnauthorized: false } : false,
    family: ipFamily,
  });
}

pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch((err) => console.error('❌ PostgreSQL connection error:', err));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
 
