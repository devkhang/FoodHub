const { validationResult } = require("express-validator");
const DeliveryPartner = require("../../accesscontrol/models/deliveryPartner");
const User = require("../../accesscontrol/models/user");
const Account = require("../../accesscontrol/models/account");
const Seller = require("../../accesscontrol/models/seller");
const DeliveryDetail = require("../models/deliveryDetail");
const { promisify } = require('node:util');
const jwt=require("jsonwebtoken");
const path=require("path");

const dotenv=require("dotenv");
dotenv.config(path.join(__dirname, ".env"));

//socket
const deliveryAssignmentMap=require("../../../socket/sources/DeliveryAssignmentMap");

/**
 * Middleware để lấy thông tin chi tiết đầy đủ về một DeliveryPartner
 * bao gồm Account, DeliveryDetails, Order, User, Seller và Items,
 * sử dụng phương thức GET (accountId được truyền qua req.params).
 */
exports.createDeliveryDetailMiddleware = async (req, res, next) => {
  // 1. Kiểm tra lỗi xác thực (nếu bạn sử dụng express-validator cho body)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // 2. Lấy dữ liệu cần thiết từ request body
  const {
    orderId,
    DeliveryPartnerId, // ID của DeliveryPartner
    endTime,
    deliveryCharge,
    moneyReceived,
    change,
  } = req.body;

  // 3. Kiểm tra các trường bắt buộc tối thiểu
  if (!orderId || !DeliveryPartnerId || !endTime) {
    return res.status(400).json({
      error:
        "Thiếu các trường bắt buộc: orderId, DeliveryPartnerId, và endTime.",
    });
  }
  console.log("orderId : ", orderId);
  try {
    // 4. Khởi tạo một document DeliveryDetail mới
    const deliveryDetail = new DeliveryDetail({
      // Khóa ngoại BẮT BUỘC
      order: orderId,
      DeliveryPartnerId: DeliveryPartnerId,

      // Dữ liệu Chi tiết Giao hàng BẮT BUỘC
      endTime: endTime,

      // Dữ liệu Chi tiết Giao hàng Tùy chọn
      deliveryCharge: deliveryCharge,
      moneyReceived: moneyReceived,
      change: change,
    });

    // 5. Lưu document vào database
    const savedDeliveryDetail = await deliveryDetail.save();

    // 6. Trả về kết quả thành công và document đã tạo
    return res.status(201).json({
      message: "Tạo chi tiết giao hàng thành công.",
      deliveryDetail: savedDeliveryDetail,
    });
  } catch (error) {
    console.error("Lỗi khi tạo và lưu DeliveryDetail:", error);

    // Xử lý lỗi Mongoose Validation (ví dụ: ObjectId không hợp lệ)
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        error:
          "Dữ liệu không hợp lệ. Vui lòng kiểm tra định dạng ID (ObjectId) và ngày tháng.",
        details: error.message,
      });
    }

    // Lỗi máy chủ chung
    next(error);
  }
};

exports.getFullDeliveryChainMiddleware = async (req, res, next) => {
  // Kiểm tra lỗi xác thực từ express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // 🎯 CHỈ LẤY accountId TỪ req.params (Đã loại bỏ req.body)
  const accountId = req.params.accountId;

  // Kiểm tra xem accountId có được cung cấp không
  if (!accountId) {
    // Lỗi này xảy ra nếu route không có tham số (ví dụ: router.get('/info'))
    return res.status(400).json({
      error:
        "Account ID là bắt buộc và phải được cung cấp qua URL parameters (ví dụ: /info/:accountId).",
    });
  }

  try {
    // Bắt đầu từ DeliveryPartner, tìm bằng khóa ngoại 'account'
    const partnerInfo = await DeliveryPartner.findOne({
      account: accountId,
    })
      .populate({
        path: "account", // Cấp 1: Account
        select: "email role isVerified",
      })
      .populate({
        path: "deliveryDetails", // Cấp 2: Trường ảo (Virtual Populate)
        select: "endTime deliveryCharge moneyReceived change deliveryId order",

        // Bắt đầu Populate lồng nhau
        populate: {
          path: "order", // Cấp 3: Order
          select: "totalAmount status createdAt user seller items",

          populate: [
            {
              path: "user.userId", // Cấp 4a: User (Khách hàng)
              select: "firstName lastName phone address",
            },
            {
              path: "seller.sellerId", // Cấp 4b: Seller (Cửa hàng)
              select: "name imageURL formattedAddress address",
            },
          ],
        },
      })
      .exec();
    console.log("Partner info", partnerInfo);

    // Kiểm tra xem có tìm thấy DeliveryPartner không
    if (!partnerInfo) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy Delivery Partner cho Account ID này." });
    }
    // Trả về dữ liệu trực tiếp
    return res.status(200).json(partnerInfo);
  } catch (error) {
    console.error("Lỗi khi truy vấn chuỗi quan hệ:", error);
    return res
      .status(500)
      .json({ error: `Lỗi máy chủ khi truy vấn dữ liệu: ${error.message}` });
  }
};

exports.acceptDeliveryJob=async (req, res, next)=>{
  try{
    const {jwtToken, orderId}=req.body;
    const decodedJWT=await promisify(jwt.verify)(jwtToken, process.env.JWT_SECRET_KEY);
    if(deliveryAssignmentMap.get(orderId).accountId!=decodedJWT.accountId){
      return res.status(400).json({
        status:"fail",
        mess:`There is no order ${orderId} assigned to account ${decodedJWT.accountId}`
      });
    }
    else{
      clearTimeout(deliveryAssignmentMap.get(orderId).timeout);
      let deliveryDetail=await DeliveryDetail.create({
        order:orderId,
        deliveryCharge:0,//[not done: get actual delivery charge in backend]
        DeliveryPartnerId:decodedJWT.accountId,
      });
      await DeliveryDetail.populate(deliveryDetail, {
        path:"order",
        select:"user seller items",
        populate:{
          path:"seller.sellerId",
          select:"address"
        }
      });
      let totalItemMoney=0;
      for (let foodSelection of deliveryDetail.order.items){
        totalItemMoney+=foodSelection.item.price*foodSelection.quantity;
      }
      deliveryDetail=deliveryDetail.toObject();
      deliveryDetail.order.items=null;
      deliveryDetail.totalItemMoney=totalItemMoney;
      // deliveryDetail.aaa="aaa"
      res.status(200).json({
        status:"ok",
        data:deliveryDetail
      });
    }

  }
  catch(error){
    next(error, req, res, next);
  }
}

