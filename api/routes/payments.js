const express = require('express');
const router = express.Router();
const { bot } = require('../bot');
const pool = require('../db/pool');
const verifyTelegram = require('../middleware/verifyTelegram');

router.use(verifyTelegram);

const pendingOrders = {};
let nextDraftId = 1;

router.post('/create-invoice-link', async (req, res) => {
  const { items, contactName, phone, shippingAddress, couponCode } = req.body;
  const telegramUser = req.telegramUser;

  try {
    let subtotal = 0;
    const prices = [];
    for (const item of items) {
      const result = await pool.query('SELECT name, price FROM products WHERE id = $1', [item.productId]);
      const product = result.rows[0];
      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;
      prices.push({ label: product.name, amount: Math.round(lineTotal * 100) });
    }

    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const couponResult = await pool.query(
        'SELECT * FROM coupons WHERE code = $1 AND is_active',
        [couponCode.trim().toUpperCase()]
      );
      const coupon = couponResult.rows[0];
      if (coupon && (!coupon.expires_at || new Date(coupon.expires_at) > new Date())
          && (!coupon.usage_limit || coupon.times_used < coupon.usage_limit)) {
        discountAmount = coupon.discount_type === 'percent'
          ? subtotal * (coupon.discount_value / 100)
          : Math.min(coupon.discount_value, subtotal);
        appliedCoupon = coupon.code;
        prices.push({ label: `Discount (${coupon.code})`, amount: -Math.round(discountAmount * 100) });
      }
    }

    const draftId = String(nextDraftId++);
    pendingOrders[draftId] = {
      userId: telegramUser.id,
      cart: items,
      contactName,
      phone,
      shippingAddress,
      couponCode: appliedCoupon,
      discountAmount
    };

    const invoiceLink = await bot.telegram.createInvoiceLink({
      title: 'Your Order',
      description: `${items.length} item(s) from MyShop`,
      payload: draftId,
      provider_token: process.env.PAYMENT_PROVIDER_TOKEN,
      currency: 'ETB',
      prices
    });
    res.json({ invoiceLink });
  } catch (err) {
    console.error('createInvoiceLink error:', err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

module.exports = router;
module.exports.pendingOrders = pendingOrders;
