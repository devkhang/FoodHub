const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// Định nghĩa Schema cho người giao hàng
const DeliveryPartnerSchema = new mongoose.Schema({
  // ----------------------------------------------------
  // PHẦN ẢNH (IMAGES)
  // ----------------------------------------------------

  // Ảnh chân dung
  portraitPhotoUrl: {
    type: String, // Lưu trữ đường dẫn (URL) của ảnh sau khi upload lên server/cloud
    required: [true, "Vui lòng tải lên ảnh chân dung"],
  },

  // Ảnh mặt trước giấy phép lái xe
  licenseFrontPhotoUrl: {
    type: String,
    required: [true, "Vui lòng tải lên ảnh mặt trước GPLX"],
  },

  // Ảnh mặt sau giấy phép lái xe
  licenseBackPhotoUrl: {
    type: String,
    required: [true, "Vui lòng tải lên ảnh mặt sau GPLX"],
  },

  // ----------------------------------------------------
  // PHẦN THÔNG TIN CƠ BẢN (BASIC INFO)
  // ----------------------------------------------------

  firstName: {
    type: String,
    required: [true, "Vui lòng nhập Tên"],
    trim: true,
  },

  lastName: {
    type: String,
    required: [true, "Vui lòng nhập Họ"],
    trim: true,
  },

  phone: {
    type: String,
    required: [true, "Vui lòng nhập Số điện thoại"],
    trim: true,
    // Bạn có thể thêm regex để xác thực định dạng số điện thoại tại đây
  },

  password: {
    type: String,
    minlength: [6, "Mật khẩu phải có ít nhất 6 ký tự"],
    // Lưu ý: Mật khẩu phải được HASH trước khi lưu vào database (ví dụ: dùng bcrypt)
  },
  CCCD: {
    type: String, // Lưu dưới dạng chuỗi để giữ số 0 đứng đầu (ví dụ: "001234567890")
    required: [true, "Vui lòng nhập số CCCD"], // Bắt buộc
    unique: true, // Đảm bảo không trùng CCCD trong collection
    trim: true, // Loại bỏ khoảng trắng thừa
    validate: [
      {
        validator: function (value) {
          return /^[0-9]{12}$/.test(value); // Regex: Chỉ 12 chữ số, không ký tự đặc biệt
        },
        message: "CCCD phải là số gồm đúng 12 chữ số.",
      },
    ],
    // Lưu ý: Validation cấu trúc nâng cao (mã tỉnh, giới tính, năm sinh) đã có trong router
  },
  // Không cần trường 'confirmPassword' trong Schema, nó chỉ dùng để xác thực ở Frontend/Backend

  // ----------------------------------------------------
  // PHẦN BỔ SUNG (OPTIONAL)
  // ----------------------------------------------------
  account: { type: Schema.Types.ObjectId, required: true, ref: "Account" },
  createdAt: {
    type: Date,
    default: Date.now,
  },
},{
    // 💡 Bật virtuals để cho phép truy vấn ngược
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true } 
});

DeliveryPartnerSchema.virtual('deliveryDetails', {
    ref: 'DeliveryDetail',          
    localField: '_id',              
    foreignField: 'DeliveryPartnerId',
    justOne: false                  
});
// Tạo Model từ Schema
const DeliveryPartner = mongoose.model(
  "DeliveryPartner",
  DeliveryPartnerSchema
);

module.exports = DeliveryPartner;
