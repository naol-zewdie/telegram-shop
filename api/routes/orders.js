const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const verifyTelegram = require('../middleware/verifyTelegram');
const { getOrCreateUser } = require('../lib/users');

router.use(verifyTelegram);

router.get('/', async (req, res) => {
  try {
    const user = await getOrCreateUser(req.telegramUser);
    const orders = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    const withItems = await Promise.all(orders.rows.map(async order => {
      const items = await pool.query(
        `SELECT oi.quantity, oi.unit_price, p.name
         FROM order_items oi JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      return { ...order, items: items.rows };
    }));

    res.json(withItems);
  } catch (err) {
    console.error('orders get error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// Called by bot.js after a successful Telegram payment
async function createOrderFromPayment(draft, successfulPayment) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [draft.userId]
    );
    const userId = userResult.rows[0]?.id;

    const total = successfulPayment.total_amount / 100;
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, total, shipping_address, payment_ref, coupon_code, discount_amount, contact_name, phone)
       VALUES ($1, 'paid', $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        userId, total, draft.shippingAddress, successfulPayment.telegram_payment_charge_id,
        draft.couponCode || null, draft.discountAmount || 0,
        draft.contactName || null, draft.phone || null
      ]
    );
    const order = orderResult.rows[0];

    for (const item of draft.cart) {
      const productResult = await client.query('SELECT price FROM products WHERE id = $1', [item.productId]);
      const unitPrice = productResult.rows[0]?.price;

      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [order.id, item.productId, item.quantity, unitPrice]
      );

      await client.query(
        'UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2',
        [item.quantity, item.productId]
      );
    }

    if (draft.couponCode) {
      await client.query(
        'UPDATE coupons SET times_used = times_used + 1 WHERE code = $1',
        [draft.couponCode]
      );
    }

    await client.query('DELETE FROM carts WHERE user_id = $1', [userId]);

    await client.query('COMMIT');
    return order;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = router;
module.exports.createOrderFromPayment = createOrderFromPayment;
