const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const accountSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["ROLE_USER","ROLE_SELLER","ROLE_DELIVERY"],
      required: true,
    },
    accountVerifyToken: String,
    accountVerifyTokenExpiration: Date,
    isVerified: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Account", accountSchema);
