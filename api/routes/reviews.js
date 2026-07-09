const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const verifyTelegram = require('../middleware/verifyTelegram');
const { getOrCreateUser } = require('../lib/users');

router.get('/:productId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.rating, r.comment, r.created_at, u.first_name, u.username
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.productId]
    );
    const avgResult = await pool.query(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS count FROM reviews WHERE product_id = $1',
      [req.params.productId]
    );
    res.json({
      reviews: result.rows,
      averageRating: avgResult.rows[0].avg_rating ? Number(avgResult.rows[0].avg_rating).toFixed(1) : null,
      count: Number(avgResult.rows[0].count)
    });
  } catch (err) {
    console.error('reviews get error:', err);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

router.post('/:productId', verifyTelegram, async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }
  try {
    const user = await getOrCreateUser(req.telegramUser);
    const result = await pool.query(
      `INSERT INTO reviews (product_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id, user_id)
       DO UPDATE SET rating = $3, comment = $4, created_at = now()
       RETURNING *`,
      [req.params.productId, user.id, rating, comment || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('reviews post error:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

module.exports = router;
