const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
  amount: { type: Number, required: true }, // Tổng tiền (order.totalAmount + deliveryFee)
  method: { type: String, enum: ["CASH", "CARD", "BANK_TRANSFER"], required: true },
  status: { type: String, enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"], default: "PENDING" },
  gatewayTransactionId: { type: String }, // ID từ Stripe
  paidAt: { type: Date },
  commission: { type: Number, default: 0 }, // Hoa hồng 10% cho marketplace
  sellerAmount: { type: Number, default: 0 }, // 90% cho seller
  user: { type: Schema.Types.ObjectId, ref: "User" },
  seller: { type: Schema.Types.ObjectId, ref: "Seller" },
  transferredAt: { type: Date }, // Thời gian chuyển tiền cho seller
}, { timestamps: true });

paymentSchema.index({ order: 1, status: 1 });
module.exports = mongoose.model("Payment", paymentSchema);