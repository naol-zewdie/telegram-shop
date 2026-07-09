const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const verifyAdmin = require('../middleware/verifyAdmin');

router.use(verifyAdmin);

// --- Stats ---

router.get('/stats', async (req, res) => {
  try {
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total_revenue, COUNT(*) AS order_count
       FROM orders WHERE status != 'cancelled'`
    );

    const bestSellersResult = await pool.query(
      `SELECT p.id, p.name, SUM(oi.quantity) AS units_sold, SUM(oi.quantity * oi.unit_price) AS revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status != 'cancelled'
       GROUP BY p.id, p.name
       ORDER BY units_sold DESC
       LIMIT 5`
    );

    const lowStockResult = await pool.query(
      `SELECT id, name, stock FROM products WHERE is_active AND stock <= 5 ORDER BY stock ASC`
    );

    res.json({
      totalRevenue: Number(revenueResult.rows[0].total_revenue),
      orderCount: Number(revenueResult.rows[0].order_count),
      bestSellers: bestSellersResult.rows,
      lowStock: lowStockResult.rows
    });
  } catch (err) {
    console.error('admin stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// --- Categories ---

router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(p.id) AS product_count
       FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.is_active
       GROUP BY c.id
       ORDER BY c.sort_order, c.name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('admin categories get error:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

router.post('/categories', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('admin categories post error:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.patch('/categories/:id', async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'UPDATE categories SET name = COALESCE($1, name) WHERE id = $2 RETURNING *',
      [name?.trim(), req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('admin categories patch error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const productCheck = await pool.query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1 AND is_active',
      [req.params.id]
    );
    if (Number(productCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete a category that still has active products. Move or remove those products first.'
      });
    }

    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('admin categories delete error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// --- Coupons ---

router.get('/coupons', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('admin coupons get error:', err);
    res.status(500).json({ error: 'Failed to load coupons' });
  }
});

router.post('/coupons', async (req, res) => {
  const { code, discount_type, discount_value, usage_limit, expires_at } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO coupons (code, discount_type, discount_value, usage_limit, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code.trim().toUpperCase(), discount_type, discount_value, usage_limit || null, expires_at || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('admin coupons post error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A coupon with this code already exists' });
    }
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

router.patch('/coupons/:id', async (req, res) => {
  const { is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE coupons SET is_active = $1 WHERE id = $2 RETURNING *',
      [is_active, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('admin coupons patch error:', err);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

// --- Products ---

router.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('admin products get error:', err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

router.post('/products', async (req, res) => {
  const { category_id, name, description, price, stock, image_urls } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO products (category_id, name, description, price, stock, image_urls)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [category_id, name, description, price, stock, image_urls || []]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('admin products post error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.patch('/products/:id', async (req, res) => {
  const { stock, price, is_active, image_urls } = req.body;
  try {
    const result = await pool.query(
      `UPDATE products SET
         stock = COALESCE($1, stock),
         price = COALESCE($2, price),
         is_active = COALESCE($3, is_active),
         image_urls = COALESCE($4, image_urls)
       WHERE id = $5 RETURNING *`,
      [stock, price, is_active, image_urls || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('admin products patch error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE products SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('admin products delete error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// --- Orders ---

router.get('/orders', async (req, res) => {
  try {
    const orders = await pool.query(
      `SELECT o.*, u.username, u.first_name, u.telegram_id
       FROM orders o LEFT JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC`
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
    console.error('admin orders get error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    const order = result.rows[0];

    const userResult = await pool.query('SELECT telegram_id FROM users WHERE id = $1', [order.user_id]);
    const telegramId = userResult.rows[0]?.telegram_id;
    if (telegramId) {
      const { notifyOrderStatus } = require('../bot');
      await notifyOrderStatus(telegramId, order.id, status);
    }

    res.json(order);
  } catch (err) {
    console.error('admin order status patch error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;
