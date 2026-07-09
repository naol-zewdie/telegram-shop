const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const verifyTelegram = require('../middleware/verifyTelegram');
const { getOrCreateUser } = require('../lib/users');

router.use(verifyTelegram);

router.get('/', async (req, res) => {
  try {
    const user = await getOrCreateUser(req.telegramUser);
    const result = await pool.query(
      `SELECT w.product_id, p.name, p.price, p.image_urls, p.stock, p.is_active
       FROM wishlists w JOIN products p ON p.id = w.product_id
       WHERE w.user_id = $1
       ORDER BY w.added_at DESC`,
      [user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('wishlist get error:', err);
    res.status(500).json({ error: 'Failed to load wishlist' });
  }
});

router.post('/:productId', async (req, res) => {
  try {
    const user = await getOrCreateUser(req.telegramUser);
    await pool.query(
      `INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING`,
      [user.id, req.params.productId]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('wishlist post error:', err);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

router.delete('/:productId', async (req, res) => {
  try {
    const user = await getOrCreateUser(req.telegramUser);
    await pool.query(
      'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
      [user.id, req.params.productId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('wishlist delete error:', err);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

module.exports = router;
