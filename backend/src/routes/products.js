const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /products - creates a simple product (name, price, description, createdBy)
router.post('/', async (req, res) => {
  const { name, price, description, createdBy } = req.body || {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Field "name" is required and must be text.' });
  }
  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ error: 'Field "price" is required and must be a number >= 0.' });
  }
  if (!createdBy || typeof createdBy !== 'string') {
    return res.status(400).json({ error: 'Field "createdBy" is required and must be text.' });
  }

  try {
    const product = await db.createProduct({ name, price: Number(price), description, createdBy });
    res.status(201).json(product);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Could not create the product.', detail: err.message });
  }
});

// GET /products - lists all products
router.get('/', async (req, res) => {
  try {
    const products = await db.listProducts();
    res.json(products);
  } catch (err) {
    console.error('Error listing products:', err);
    res.status(500).json({ error: 'Could not list products.', detail: err.message });
  }
});

// GET /products/:id - fetches a product by id
router.get('/:id', async (req, res) => {
  try {
    const product = await db.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Could not fetch the product.', detail: err.message });
  }
});

module.exports = router;
