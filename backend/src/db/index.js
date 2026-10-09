// Selects the database adapter based on DB_DRIVER.
const driver = process.env.DB_DRIVER || 'memory';

function loadMemoryAdapter() {
  let products = [];
  let nextId = 1;
  return {
    async init() {},
    async ping() {},
    async createProduct({ name, price, description, createdBy }) {
      const product = {
        id: nextId++,
        name,
        price,
        description: description || null,
        created_by: createdBy,
        created_at: new Date().toISOString()
      };
      products.unshift(product);
      return product;
    },
    async listProducts() {
      return products;
    },
    async getProduct(id) {
      return products.find((p) => p.id === Number(id)) || null;
    }
  };
}

let adapter;
if (driver === 'postgres') {
  adapter = require('./postgres');
} else if (driver === 'oracle') {
  adapter = require('./oracle');
} else {
  adapter = loadMemoryAdapter();
}

function isMissingTableError(err) {
  return err?.code === '42P01' || err?.errorNum === 942 || /ORA-00942/i.test(err?.message || '');
}

async function withSelfHeal(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
    console.error('[db] table missing on query, re-running init():', err.message);
    await adapter.init();
    return await fn();
  }
}

module.exports = {
  driver,
  init: adapter.init,
  ping: adapter.ping,
  createProduct: (data) => withSelfHeal(() => adapter.createProduct(data)),
  listProducts: () => withSelfHeal(() => adapter.listProducts()),
  getProduct: (id) => withSelfHeal(() => adapter.getProduct(id))
};
