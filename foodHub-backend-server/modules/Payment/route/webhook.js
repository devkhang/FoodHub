const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../../order/models/order');
const Payment = require('../models/Payment');

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const findOrderWithRetry = async (sessionId, retries = 5, delay = 500) => {
    for (let i = 0; i < retries; i++) {
        const order = await Order.findOne({ sessionId });
        if (order) {
            console.log(`[RETRY] Tìm thấy Order sau ${i + 1} lần thử.`);
            return order; // Tìm thấy!
        }
        // Nếu không tìm thấy và chưa hết lần thử cuối, chờ rồi thử lại
        if (i < retries - 1) {
            await sleep(delay);
        }
    }
    // Trả về null sau khi đã thử hết số lần
    return null; 
};
// WEBHOOK NHẬN RAW BODY
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error(`[WEBHOOK] Signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // THANH TOÁN THÀNH CÔNG → TẠO PAYMENT
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const sessionId = session.id;
      console.log("session :",session);
      console.log(`[WEBHOOK] Session completed: ${sessionId}`);
      const order = await findOrderWithRetry(sessionId, 5, 1000);
      if (!order) {
        console.warn(`[WEBHOOK] Không tìm thấy Order với sessionId: ${sessionId}`);
        return res.json({ received: true });
      }

      // TẠO PAYMENT
      const payment = new Payment({
        order: order._id,
        amount: session.amount_total/100,
        currency: session.currency.toUpperCase(),
        method: "CARD",
        status: "SUCCESS",
        gatewayTransactionId: session.payment_intent,
        paidAt: new Date(),
        user: order.user.userId,
        seller: order.seller.sellerId,
      });

      await payment.save();
      console.log(`[WEBHOOK] Payment created for Order: ${order._id}`);
    }

    // PAYOUT CHO SELLER → CẬP NHẬT PAYMENT
    if (event.type === 'transfer.created') {
      const transfer = event.data.object;
      const orderId = transfer.metadata.orderId; // ← DÙNG orderId

      if (!orderId) {
        console.warn(`[WEBHOOK] Thiếu orderId trong transfer metadata`);
        return res.json({ received: true });
      }
      let order = null;
      for (let i = 0; i < 5; i++) {
          order = await Order.findById(orderId);
          if (order) break;
          await sleep(1000); // Chờ 1 giây trước khi thử lại
      }
      if (!order) {
        console.warn(`[WEBHOOK] Không tìm thấy Order: ${orderId}`);
        return res.json({ received: true });
      }

      // CẬP NHẬT PAYMENT
      await Payment.findOneAndUpdate(
        { order: orderId },
        {
          commission: order.commission,
          sellerAmount: order.sellerAmount,
          transferredAt: new Date(),
          gatewayTransactionId: transfer.id,
        }
      );

      console.log(`[WEBHOOK] Payment updated for Order: ${orderId}`);
    }

    res.json({ received: true });
  }
);

module.exports = router;