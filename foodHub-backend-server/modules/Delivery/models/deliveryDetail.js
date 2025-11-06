const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Định nghĩa Schema cho DeliveryDetail
// const DeliveryDetailSchema = new Schema({
//   // Tương ứng với trường _id trong hình ảnh
//   _id: {
//     type: Schema.Types.ObjectId,
//     auto: true, // Mongoose tự động tạo _id
//   },
  
//   // Tham chiếu đến collection Order (Order cần được định nghĩa riêng)
//   order: {
//     type: Schema.Types.ObjectId,
//     ref: "Order", // Giả định tên Model Order là 'Order'
//   },


//   // Tương ứng với trường endTime (timestamp)
//   endTime: {
//     type: Date, // Date trong Mongoose tương đương với timestamp
//     required: false,
//     default:null
//   },

//   // Tương ứng với trường deliveryCharge (double)
//   deliveryCharge: {
//     type: Number, // Number trong Mongoose tương đương với double
//   },

//   // Tương ứng với trường moneyReceived (double)
//   moneyReceived: {
//     type: Number,
//   },
  
//   // Tương ứng với trường change (double)
//   change: {
//     type: Number,
//   },
  
//   // THAM CHIẾU TỪ DELIVERYPARTNER (Thêm vào dựa trên mối quan hệ trong hình ảnh)
//   // Trong hình ảnh, DeliveryDetail có mối quan hệ với DeliveryPartner
//   DeliveryPartnerId: {
//       type: Schema.Types.ObjectId,
//       ref: "DeliveryPartner", 
//       // Giả định mối quan hệ là Required (tùy thuộc vào logic kinh doanh)
//       // Trong hình ảnh, đường kết nối từ DeliveryDetail đến DeliveryPartner là mũi tên đơn,
//       // thường ngụ ý DeliveryDetail chứa khóa ngoại của DeliveryPartner
//       // Tuy nhiên, dựa vào hình ảnh, _id của DeliveryDetail liên kết với DeliveryPartner, 
//       // nhưng trường này không hiển thị rõ ràng. Ta có thể bổ sung như sau:
//       // (Nếu DeliveryPartnerSchema có trường orders[], thì đây là mối quan hệ 1-n)
//       // *Nếu bạn muốn tham chiếu DeliveryPartner ở đây, bạn có thể thêm:
//       // deliveryPartner: { type: Schema.Types.ObjectId, ref: 'DeliveryPartner' },
//   },

//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

const DeliveryDetailSchema = new Schema({
  // Tương ứng với trường _id trong hình ảnh
  _id: {
    type: Schema.Types.ObjectId,
    auto: true, // Mongoose tự động tạo _id
  },
  
  // Tham chiếu đến collection Order (Order cần được định nghĩa riêng)
  order: {
    type: Schema.Types.ObjectId,
    ref: "Order", // Giả định tên Model Order là 'Order'
  },


  // Tương ứng với trường endTime (timestamp)
  endTime: {
    type: Date, // Date trong Mongoose tương đương với timestamp
    required: false,
    default:null
  },

  // Tương ứng với trường deliveryCharge (double)
  deliveryCharge: {
    type: Number, // Number trong Mongoose tương đương với double
  },
  drone: {
      type: String, 
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Tạo Model từ Schema
const DeliveryDetail = mongoose.model("DeliveryDetail", DeliveryDetailSchema);

module.exports = DeliveryDetail;