// controllers/stripeController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../../order/models/order');  // Model Order của bạn
const Payment = require('../models/Payment');  // Model Payment của bạn
const Seller = require('../../accesscontrol/models/seller');  // Để lấy acct_xxx
// GET: Lấy thông tin Connect Account
exports.getAccountInfo = async (req, res) => {
  try {
    const { accountId } = req.params;
    // Gọi Stripe API
    const account = await stripe.accounts.retrieve(accountId);

    // Dữ liệu trả về an toàn
    const accountInfo = {
      id: account.id,
      email: account.email,
      business_name: account.business_profile?.name || account.business_name || 'Chưa đặt tên',
      country: account.country,
      currency: account.default_currency,
      status: account.charges_enabled && account.payouts_enabled ? 'Hoàn tất' : 'Chưa hoàn tất',
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      bank_accounts: account.external_accounts?.data?.map(bank => ({
        bank_name: bank.bank_name,
        last4: bank.last4,
        currency: bank.currency,
        status: bank.status
      })) || []
    };

    res.json({
      success: true,
      account: accountInfo
    });

  } catch (error) {
    console.error('Lỗi lấy thông tin Stripe:', error.message);

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'ID tài khoản Stripe không hợp lệ' });
    }

    res.status(500).json({ error: 'Lỗi server khi kết nối Stripe' });
  }
};


// routes/stripe.js
exports.deleteOnlyInStripe = async (req, res) => {
  const { stripeAccountId } = req.body; // acct_123...

  // Kiểm tra ID hợp lệ
  if (!stripeAccountId?.startsWith('acct_')) {
    return res.status(400).json({ error: 'ID Stripe sai!' });
  }

  try {
    // 🔥 XÓA NGAY TRONG STRIPE
    const deleted = await stripe.accounts.del(stripeAccountId);

    res.json({
      success: true,
      message: 'ĐÃ XÓA VĨNH VIỄN TRONG STRIPE!',
      deletedId: deleted.id,
      deleted: deleted.deleted, // true
    });
  } catch (error) {
    // Test mode: xóa thoải mái
    // Live mode: cần rút hết tiền về 0đ
    res.status(400).json({
      error: error.message,
      tip: error.message.includes('balance')
        ? 'RÚT HẾT TIỀN VỀ 0đ → thử lại!'
        : 'Test mode: xóa ngay. Live: liên hệ Stripe Support.',
    });
  }
};

exports.createPayment = async (req, res, next) => {
  const { orderId } = req.body;  // Không cần method param
  const userId = req.loggedInUserId;  // Từ middleware

  try {
    const order = await Order.findById(orderId);
    if (!order || order.user.userId.toString() !== userId.toString()) {
      return res.status(400).json({ error: 'Order không hợp lệ!' });
    }

    const amount = order.totalItemMoney;  // Virtual tiền món
    if (amount <= 0) {
      return res.status(400).json({ error: 'Tổng tiền không hợp lệ!' });
    }

    // Tạo Payment 'PENDING' (luôn CARD)
    const payment = new Payment({
      order: order._id,
      amount: amount,
      method: 'CARD',  // Hardcode CARD
      user: order.user.userId,
      seller: order.seller.sellerId,
      status: 'PENDING'
    });
    await payment.save();

    // Luôn gọi Stripe PaymentIntent (CARD)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,  // Cents USD
      currency: 'usd',
      metadata: { orderId: order._id.toString(), userId: userId.toString() }
    });
    payment.gatewayTransactionId = paymentIntent.id;
    await payment.save();

    // Update Order với payment ref
    order.payment = payment._id;
    await order.save();

    res.status(201).json({ 
      message: 'Payment tạo thành công!', 
      paymentId: payment._id, 
      amount: amount,
      clientSecret: paymentIntent.client_secret  // Frontend dùng để quẹt thẻ
    });
  } catch (error) {
    console.error('Tạo payment lỗi:', error);
    res.status(500).json({ error: 'Tạo thanh toán thất bại!' });
  }
};

// API 2: Confirm Payment (Sau Quẹt Thẻ OK)
exports.confirmPayment = async (req, res, next) => {
  const { orderId } = req.params;
  const userId = req.loggedInUserId;

  try {
    const order = await Order.findById(orderId).populate('payment');
    if (!order || order.user.userId.toString() !== userId.toString()) {
      return res.status(400).json({ error: 'Order không hợp lệ!' });
    }

    const payment = order.payment;
    if (!payment || payment.status !== 'PENDING') {
      return res.status(400).json({ error: 'Payment đã xử lý!' });
    }

    // Update SUCCESS (giả sử frontend confirm sau quẹt thẻ)
    payment.status = 'SUCCESS';
    payment.paidAt = new Date();
    await payment.save();

    // Tính commission 10% & sellerAmount
    const commission = payment.amount * 0.1;
    payment.commission = commission;
    payment.sellerAmount = payment.amount - commission;
    await payment.save();

    // Transfer 90% cho seller (Stripe)
    const transfer = await stripe.transfers.create({
      amount: payment.sellerAmount * 100,
      currency: 'usd',
      destination: order.seller.stripeAccountId,
      source_transaction: payment.gatewayTransactionId,
      metadata: { orderId, paymentId: payment._id }
    });
    payment.transferredAt = new Date();
    await payment.save();

    // Update order status
    order.status = 'Accepted';
    await order.save();

    res.json({ message: 'Payment xác nhận thành công!', transferId: transfer.id, sellerAmount: payment.sellerAmount });
  } catch (error) {
    console.error('Confirm payment lỗi:', error);
    res.status(500).json({ error: 'Xác nhận thất bại!' });
  }
};

// API 3: Refund Payment
exports.refundPayment = async (req, res, next) => {
  const { paymentId } = req.params;
  const userId = req.loggedInUserId;

  try {
    const payment = await Payment.findById(paymentId).populate('order');
    if (!payment || payment.status !== 'SUCCESS') {
      return res.status(400).json({ error: 'Không thể refund!' });
    }
    if (payment.order.user.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Không có quyền!' });
    }

    const refund = await stripe.refunds.create({
      payment_intent: payment.gatewayTransactionId,
      amount: payment.amount * 100
    });
    payment.status = 'REFUNDED';
    payment.transferredAt = null;
    await payment.save();
    payment.order.status = 'Cancelled';
    await payment.order.save();
    res.json({ message: 'Refund thành công!', refundId: refund.id });
  } catch (error) {
    console.error('Refund lỗi:', error);
    res.status(500).json({ error: 'Refund thất bại!' });
  }
};

// API 4: Get Status
exports.getPaymentStatus = async (req, res, next) => {
  const { paymentId } = req.params;
  const userId = req.loggedInUserId;

  try {
    const payment = await Payment.findById(paymentId).populate('order');
    if (!payment) {
      return res.status(404).json({ error: 'Payment không tìm thấy!' });
    }
    if (payment.user.toString() !== userId.toString() && payment.seller.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Không có quyền!' });
    }
    res.json({
      status: payment.status,
      amount: payment.amount,
      commission: payment.commission,
      sellerAmount: payment.sellerAmount,
      totalItemMoney: payment.order.totalItemMoney,
      method: payment.method,
      paidAt: payment.paidAt,
      transferredAt: payment.transferredAt
    });
  } catch (error) {
    console.error('Get status lỗi:', error);
    res.status(500).json({ error: 'Lấy status thất bại!' });
  }
};
