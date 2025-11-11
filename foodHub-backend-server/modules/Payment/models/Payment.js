const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
  amount: { type: Number, required: true }, // Tổng tiền (order.totalAmount + deliveryFee)
  currency: { type: String, default: 'USD' }, // Thêm: Default USD cho Stripe US
  method: { type: String, enum: ["CASH", "CARD", "BANK_TRANSFER"], required: true },
  status: { type: String, enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"], default: "PENDING" },
  gatewayTransactionId: { type: String }, // ID từ Stripe
  paidAt: { type: Date },
  commission: { type: Number, default: 0 }, // Hoa hồng 10% cho marketplace
  sellerAmount: { type: Number, default: 0 }, // 90% cho seller (giữ nguyên, hoặc dùng virtual thay)
  user: { type: Schema.Types.ObjectId, ref: "User" },
  seller: { type: Schema.Types.ObjectId, ref: "Seller" },
  transferredAt: { type: Date }, // Thời gian chuyển tiền cho seller
}, { 
  timestamps: true,
  toJSON: { virtuals: true },  // Thêm: Bật virtual khi JSON response
  toObject: { virtuals: true } // Thêm: Bật virtual khi object
});

// Virtual netAmount: Tự tính tiền seller nhận (thông minh, không lưu DB)
paymentSchema.virtual('netAmount').get(function () {
  return this.amount - this.commission;  // Tiền sau trừ phí (giống sellerAmount nhưng động)
});

// Index cũ + mới
paymentSchema.index({ order: 1, status: 1 });  // Giữ: Query order + status nhanh
paymentSchema.index({ seller: 1, status: 1 });  // Thêm: Seller xem pay SUCCESS của mình

module.exports = mongoose.model("Payment", paymentSchema);