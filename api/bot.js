require('dotenv').config({ path: '../.env' });
const { Telegraf, Markup } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply(
    `Welcome, ${ctx.from.first_name}! 🛍️`,
    Markup.inlineKeyboard([
      Markup.button.webApp('🛍️ Open Shop', process.env.WEBAPP_URL)
    ])
  );
});

bot.on('pre_checkout_query', (ctx) => {
  ctx.answerPreCheckoutQuery(true);
});

bot.on('successful_payment', async (ctx) => {
  const draftId = ctx.message.successful_payment.invoice_payload;
  const { pendingOrders } = require('./routes/payments');
  const draft = pendingOrders[draftId];

  if (!draft) {
    ctx.reply('Payment received, but we could not find your order details. Please contact support.');
    return;
  }

  const { createOrderFromPayment } = require('./routes/orders');
  const order = await createOrderFromPayment(draft, ctx.message.successful_payment);
  delete pendingOrders[draftId];

  ctx.reply(`✅ Payment received! Order #${order.id} is confirmed and being processed.`);
});

async function notifyOrderStatus(telegramId, orderId, status) {
  await bot.telegram.sendMessage(telegramId, `📦 Order #${orderId} is now: ${status}`);
}

module.exports = { bot, notifyOrderStatus };
