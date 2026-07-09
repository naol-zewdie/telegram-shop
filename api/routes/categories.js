const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order, name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('categories error:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

module.exports = router;
