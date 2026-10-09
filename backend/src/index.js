require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const productsRouter = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 8080;
const CLOUD_PROVIDER = process.env.CLOUD_PROVIDER || 'local'; // aws | gcp | azure | oci | local

app.use(cors());
app.use(express.json());

// GET /health - health endpoint required by the assignment (section 4.3.1)
app.get('/health', async (req, res) => {
  try {
    await db.ping();
    res.json({
      status: 'ok',
      provider: CLOUD_PROVIDER,
      dbDriver: db.driver,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      provider: CLOUD_PROVIDER,
      dbDriver: db.driver,
      error: err.message
    });
  }
});

app.use('/products', productsRouter);

app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

async function initDbWithRetry(retries = 5, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await db.init();
      console.log(`[db] initialized successfully (driver=${db.driver})`);
      return;
    } catch (err) {
      console.error(`[db] attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function start() {
  try {
    await initDbWithRetry();
  } catch (err) {
    console.error('[db] could not initialize the database after several attempts:', err.message);
  }
  app.listen(PORT, () => {
    console.log(`UniMarket - products microservice listening on port ${PORT} (provider=${CLOUD_PROVIDER}, dbDriver=${db.driver})`);
  });
}

start();
