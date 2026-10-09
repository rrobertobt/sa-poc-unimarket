// Postgres adapter - valid for AWS RDS, GCP Cloud SQL, and Azure Database for PostgreSQL.
// All three platforms expose a standard Postgres endpoint, so they share this same code.
const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'unimarket',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30000
    });
  }
  return pool;
}

async function init() {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      description TEXT,
      created_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

async function ping() {
  const p = getPool();
  await p.query('SELECT 1');
}

async function createProduct({ name, price, description, createdBy }) {
  const p = getPool();
  const { rows } = await p.query(
    'INSERT INTO products (name, price, description, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, price, description || null, createdBy]
  );
  return rows[0];
}

async function listProducts() {
  const p = getPool();
  const { rows } = await p.query('SELECT * FROM products ORDER BY id DESC');
  return rows;
}

async function getProduct(id) {
  const p = getPool();
  const { rows } = await p.query('SELECT * FROM products WHERE id = $1', [id]);
  return rows[0] || null;
}

module.exports = { init, ping, createProduct, listProducts, getProduct };
