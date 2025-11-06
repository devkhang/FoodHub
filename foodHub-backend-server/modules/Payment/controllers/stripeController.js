// controllers/stripeController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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