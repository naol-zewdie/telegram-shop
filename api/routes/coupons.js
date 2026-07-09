const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const verifyTelegram = require('../middleware/verifyTelegram');

router.use(verifyTelegram);

router.post('/validate', async (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ error: 'No coupon code provided' });

  try {
    const result = await pool.query(
      'SELECT * FROM coupons WHERE code = $1 AND is_active',
      [code.trim().toUpperCase()]
    );
    const coupon = result.rows[0];

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or expired coupon code' });
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This coupon has expired' });
    }
    if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
      return res.status(400).json({ error: 'This coupon has reached its usage limit' });
    }

    const discountAmount = coupon.discount_type === 'percent'
      ? subtotal * (coupon.discount_value / 100)
      : Math.min(coupon.discount_value, subtotal);

    res.json({
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: Number(coupon.discount_value),
      discountAmount: Number(discountAmount.toFixed(2))
    });
  } catch (err) {
    console.error('coupon validate error:', err);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

module.exports = router;
