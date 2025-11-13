// routes/stripe.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeController = require('../controllers/stripeController');
const auth = require("../../../middleware/auth");
const Payment = require('../models/Payment');
const { body } = require("express-validator");
// GET /api/stripe/account/:accountId
router.get('/account/:accountId',stripeController.getAccountInfo)
router.post('/delete-stripe-only',stripeController.deleteOnlyInStripe);
router.post('/create', auth.protect, stripeController.createPayment);  // Dùng protect chung (check token + ID)
router.post('/confirm/:orderId', auth.protect, stripeController.confirmPayment);
router.post('/refund/:paymentId', auth.protect, stripeController.refundPayment);
router.get('/status/:paymentId', auth.protect, stripeController.getPaymentStatus);
// Webhook Stripe (Public, không protect)
// router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
//   const sig = req.headers['stripe-signature'];
//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
//     console.log("event receive : ",event);
//   } catch (err) {
//     console.log(`Webhook signature verification failed.`, err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // XỬ LÝ SỰ KIỆN
//   if (event.type === 'checkout.session.completed') {
//     // const session = event.data.object;
//     // const orderId = session.metadata.orderId;
//     console.log("kkkkk");
//     // // LƯU PAYMENT (thanh toán thành công)
//     // const payment = new Payment({
//     //   order: orderId,
//     //   amount: session.amount_total,
//     //   currency: session.currency.toUpperCase(),
//     //   method: "CARD",
//     //   status: "SUCCESS",
//     //   gatewayTransactionId: session.payment_intent,
//     //   paidAt: new Date(),
//     //   user: session.metadata.userId,
//     // });
//     // await payment.save();

//     // // Cập nhật Order status
//     // await Order.findByIdAndUpdate(orderId, { status: "Paid" });
//   }

//   if (event.type === 'transfer.created') {
//     // const transfer = event.data.object;
//     // const orderId = transfer.metadata.orderId;
//     console.log("lllllllllllllllllll")
//     // const order = await Order.findById(orderId);
//     // if (!order) return;

//     // // CẬP NHẬT PAYMENT SAU PAYOUT
//     // await Payment.findOneAndUpdate(
//     //   { order: orderId },
//     //   {
//     //     status: "SUCCESS",
//     //     commission: order.commission,
//     //     sellerAmount: order.sellerAmount,
//     //     seller: order.seller.sellerId,
//     //     transferredAt: new Date(),
//     //     gatewayTransactionId: transfer.id, // transfer ID
//     //   }
//     // );
//   }

//   res.json({ received: true });
// });

// router.post(
//   '/webhook',
//   express.raw({ type: 'application/json' }), // ← RAW BODY
//   (req, res) => {
//     const sig = req.headers['stripe-signature'];

//     let event;
//     try {
//       event = stripe.webhooks.constructEvent(
//         req.body, // ← raw body
//         sig,
//         process.env.STRIPE_WEBHOOK_SECRET
//       );
//     } catch (err) {
//       console.log(`Webhook Error: ${err.message}`);
//       return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     // XỬ LÝ EVENT
//     if (event.type === 'checkout.session.completed') {
//       console.log('Payment success:', event.data.object.id);
//     }

//     res.json({ received: true });
//   }
// );
const AVAILABLE_FUNDS_TEST_TOKEN = 'tok_bypassPending'
router.post('/test-add-available-funds', async (req, res) => {
    // Lấy số tiền muốn nạp từ body (nên dùng một số lớn hơn số tiền bạn muốn transfer)
    // Lưu ý: Stripe API yêu cầu số tiền phải ở đơn vị nhỏ nhất (ví dụ: VND/100 = đồng)
    const { amount } = req.body; 

    // Kiểm tra đầu vào
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Số tiền nạp không hợp lệ.' });
    }

    try {
        // Tạo một Charge sử dụng token đặc biệt
        // Token 'tok_chargeAvailable' đảm bảo tiền vào Available Balance ngay lập tức
        const charge = await stripe.charges.create({
            amount: amount, 
            currency: 'usd', // Đảm bảo khớp với currency của tài khoản bạn
            source: AVAILABLE_FUNDS_TEST_TOKEN, // ✨ TOKEN ĐẶC BIỆT
            description: 'Nạp tiền TEST vào AVAILABLE BALANCE để kiểm tra Transfer/Payout',
        });

        console.log(`Charge ID: ${charge.id}, Amount: ${charge.amount / 100} VND (Available)`);

        // Phản hồi thành công
        res.status(200).json({ 
            success: true,
            message: `Nạp thành công ${charge.amount / 100} VND vào Available Balance (TEST MODE)!`,
            chargeId: charge.id
        });

    } catch (error) {
        // Xử lý lỗi Stripe
        res.status(500).json({ 
            success: false,
            error: error.message,
            note: 'Nếu lỗi, hãy đảm bảo SECRET_KEY và CURRENCY là chính xác.'
        });
    }
});

module.exports = router;
