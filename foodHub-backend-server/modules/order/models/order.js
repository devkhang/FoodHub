const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const orderSchema = new Schema(
  {
    items: [
      {
        item: { type: Object, required: true },
        quantity: { type: Number, required: true },
      },
    ],
    status: {
      type: String,
      required: true,
      enum: [
        "Placed",
        "Cancelled",
        "Accepted",
        "Completed",
        "Out For Delivery",
        "Ready",
      ],
    },
    user: {
      userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User",
      },
      email: {
        type: String,
        required: true,
      },
      address: {
        type: Object,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
    },
    seller: {
      phone: {
        type: Number,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      sellerId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "Seller",
      },
    },
  },
  { 
    timestamps: true,
    toJSON:{virtuals:true},//HERE HERE: option
    toObject:{virtuals:true}
  }
);
orderSchema.virtual("totalItemMoney").get(function(){
  let res=0;
  for (let foodSelection of this.items){
    res+=foodSelection.item.price*foodSelection.quantity;
  }
  return res;
});

module.exports = mongoose.model("Order", orderSchema);
