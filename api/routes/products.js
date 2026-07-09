const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

const SORT_OPTIONS = {
  price_asc: 'price ASC',
  price_desc: 'price DESC',
  newest: 'created_at DESC',
  default: 'id ASC'
};

router.get('/', async (req, res) => {
  const { category, search, sort } = req.query;
  try {
    let query = 'SELECT * FROM products WHERE is_active';
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND category_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND name ILIKE $${params.length}`;
    }

    const orderBy = SORT_OPTIONS[sort] || SORT_OPTIONS.default;
    query += ` ORDER BY ${orderBy}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('products error:', err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('product detail error:', err);
    res.status(500).json({ error: 'Failed to load product' });
  }
});

module.exports = router;
