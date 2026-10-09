// Oracle Autonomous Database adapter - for the 4th provider (OCI).
// Uses the oracledb driver in "thin" mode (no Oracle Instant Client required).
// Requires the connection wallet (mTLS) downloaded from the OCI console,
// referenced via TNS_ADMIN, or a connect string with SSL params (config-time).
const oracledb = require('oracledb');
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

let poolPromise;

async function getPool() {
  if (!poolPromise) {
    poolPromise = oracledb.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING, // wallet tnsnames.ora alias, e.g. unimarketdb_high
      poolMin: 1,
      poolMax: 5
    });
  }
  return poolPromise;
}

async function init() {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      BEGIN
        EXECUTE IMMEDIATE 'CREATE TABLE products (
          id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          name VARCHAR2(200) NOT NULL,
          price NUMBER(10,2) NOT NULL,
          description CLOB,
          created_by VARCHAR2(100) NOT NULL,
          created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
        )';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLCODE != -955 THEN -- ORA-00955: object already exists
            RAISE;
          END IF;
      END;
    `);
  } finally {
    await conn.close();
  }
}

async function ping() {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    await conn.execute('SELECT 1 FROM DUAL');
  } finally {
    await conn.close();
  }
}

// Oracle uppercases unquoted identifiers, so raw driver rows come back as
// ID/NAME/PRICE/... - normalize to the same lowercase shape Postgres returns,
// so the JSON contract is identical across providers.
function mapRow(row) {
  return {
    id: row.ID,
    name: row.NAME,
    price: row.PRICE,
    description: row.DESCRIPTION,
    created_by: row.CREATED_BY,
    created_at: row.CREATED_AT
  };
}

async function createProduct({ name, price, description, createdBy }) {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO products (name, price, description, created_by)
       VALUES (:name, :price, :description, :createdBy)
       RETURNING id, name, price, description, created_by, created_at
       INTO :id, :o_name, :o_price, :o_description, :o_createdBy, :o_createdAt`,
      {
        name,
        price,
        description: description || null,
        createdBy,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        o_name: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        o_price: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        o_description: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        o_createdBy: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        o_createdAt: { dir: oracledb.BIND_OUT, type: oracledb.DATE }
      }
    );
    return {
      id: result.outBinds.id[0],
      name: result.outBinds.o_name[0],
      price: result.outBinds.o_price[0],
      description: result.outBinds.o_description[0],
      created_by: result.outBinds.o_createdBy[0],
      created_at: result.outBinds.o_createdAt[0]
    };
  } finally {
    await conn.close();
  }
}

async function listProducts() {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    const result = await conn.execute('SELECT * FROM products ORDER BY id DESC');
    return result.rows.map(mapRow);
  } finally {
    await conn.close();
  }
}

async function getProduct(id) {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    const result = await conn.execute('SELECT * FROM products WHERE id = :id', [id]);
    const rows = result.rows.map(mapRow);
    return rows[0] || null;
  } finally {
    await conn.close();
  }
}

module.exports = { init, ping, createProduct, listProducts, getProduct };
