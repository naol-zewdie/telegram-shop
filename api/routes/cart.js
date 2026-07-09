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
      `SELECT c.product_id, c.quantity, p.name, p.price, p.image_urls, p.stock
       FROM carts c JOIN products p ON p.id = c.product_id
       WHERE c.user_id = $1`,
      [user.id]
    );
    const items = result.rows.map(row => ({
      productId: row.product_id,
      quantity: row.quantity,
      product: {
        name: row.name,
        price: row.price,
        image_urls: row.image_urls,
        stock: row.stock
      }
    }));
    res.json(items);
  } catch (err) {
    console.error('cart get error:', err);
    res.status(500).json({ error: 'Failed to load cart' });
  }
});

router.post('/', async (req, res) => {
  try {
    const user = await getOrCreateUser(req.telegramUser);
    const { productId, quantity } = req.body;

    const productResult = await pool.query('SELECT stock FROM products WHERE id = $1', [productId]);
    const stock = productResult.rows[0]?.stock ?? 0;

    const existing = await pool.query(
      'SELECT quantity FROM carts WHERE user_id = $1 AND product_id = $2',
      [user.id, productId]
    );
    const currentQty = existing.rows[0]?.quantity || 0;
    const newQty = Math.min(currentQty + quantity, stock);

    if (newQty <= 0) {
      return res.status(400).json({ error: 'Out of stock' });
    }

    await pool.query(
      `INSERT INTO carts (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = $3`,
      [user.id, productId, newQty]
    );
    res.status(201).json({ success: true, quantity: newQty });
  } catch (err) {
    console.error('cart post error:', err);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

router.patch('/:productId', async (req, res) => {
  try {
    const user = await getOrCreateUser(req.telegramUser);
    const { quantity } = req.body;

    const productResult = await pool.query('SELECT stock FROM products WHERE id = $1', [req.params.productId]);
    const stock = productResult.rows[0]?.stock ?? 0;
    const clampedQty = Math.max(1, Math.min(quantity, stock));

    await pool.query(
      'UPDATE carts SET quantity = $1 WHERE user_id = $2 AND product_id = $3',
      [clampedQty, user.id, req.params.productId]
    );
    res.json({ success: true, quantity: clampedQty });
  } catch (err) {
    console.error('cart patch error:', err);
    res.status(500).json({ error: 'Failed to update quantity' });
  }
});

router.delete('/:productId', async (req, res) => {
  try {
    const user = await getOrCreateUser(req.telegramUser);
    await pool.query(
      'DELETE FROM carts WHERE user_id = $1 AND product_id = $2',
      [user.id, req.params.productId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('cart delete error:', err);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

async function clearCart(userId) {
  await pool.query('DELETE FROM carts WHERE user_id = $1', [userId]);
}

module.exports = router;
module.exports.clearCart = clearCart;
