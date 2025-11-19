const { validationResult } = require("express-validator");
const DeliveryPartner = require("../../accesscontrol/models/deliveryPartner");
const User = require("../../accesscontrol/models/user");
const Account = require("../../accesscontrol/models/account");
const Seller = require("../../accesscontrol/models/seller");
const Order= require("../../order/models/order");
const DeliveryDetail = require("../models/deliveryDetail");
const { promisify } = require('node:util');
const jwt=require("jsonwebtoken");
const path=require("path");
const axios=require("axios");
const io = require("../../../util/socket");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const dotenv=require("dotenv");
dotenv.config(path.join(__dirname, ".env"));

//socket
const DeliveyPartnerSocketMap=require("../../../socket/sources/DeliveryPartnerSource");
const {getIO}=require("../../../util/socket");
const {getObjectNearAPlace}=require("../../../util/delivery");
const order = require("../../order/models/order");
const deliveryPartnerMap = require("../../../socket/sources/DeliveryPartnerSource");
const deliveryAssignmentMap=require("../../../socket/sources/DeliveryAssignmentMap");
const {availableDrones, readyDrone, busyDrone, droneOrderAssignment}=require("../../../socket/sources/droneSource");

//delivery
const {selectNextSuitableDeliveryPartner, selectNextSuitablDrone}= require("../../order/controllers/userController");
const { options } = require("mongoose");
const Drone = require("../../accesscontrol/models/drone");


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
      //check if order is assigned
      let deliveryDetail= await DeliveryDetail.findOne({
        order:orderId
      });
      if(deliveryDetail){
        return res.status(400).json({
          status:"fail",
          mess:`order ${orderId} is already assigned`
        });
      }



      deliveryDetail=await DeliveryDetail.create({
        order:orderId,
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
      deliveryAssignmentMap.delete(orderId);
      return res.status(200).json({
        status:"ok",
        data:deliveryDetail
      });
    }

  }
  catch(error){
    next(error, req, res, next);
  }
}

exports.droneAcceptDeliveryJob=async (req, res, next)=>{
  try{
    const {droneId, orderId}=req.body;
    if(droneOrderAssignment.get(orderId).droneId!=droneId){
      return res.status(400).json({
        status:"fail",
        mess:`There is no order ${orderId} assigned to drone ${droneId}`
      });
    }
    else{
      clearTimeout(droneOrderAssignment.get(orderId).timeout);
      //check if order is assigned
      let deliveryDetail= await DeliveryDetail.findOne({
        order:orderId
      });
      if(deliveryDetail){
        return res.status(400).json({
          status:"fail",
          mess:`order ${orderId} is already assigned`
        });
      }

      deliveryDetail=await DeliveryDetail.create({
        order:orderId,
        deliveryCharge:0,//[not done: get actual delivery charge in backend]
        drone:droneId,
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

      let drone=await Drone.findOne({
        droneId:droneId
      });
      drone.status="BUSY";
      drone.save();

      busyDrone.set(droneId,null);
      readyDrone.delete(droneId);

      return res.status(200).json({
        status:"ok",
        data:deliveryDetail
      });
    }

  }
  catch(error){
    next(error, req, res, next);
  }
}

// exports.droneFinishDeliveryJob=async (req, res, next)=>{
//   try{
//     const {droneId, orderId}=req.body;
//     if(droneOrderAssignment.get(orderId).droneId!=droneId){
//       return res.status(400).json({
//         status:"fail",
//         mess:`There is no order ${orderId} assigned to drone ${droneId}`
//       });
//     }
//     else{
//       //check if order is assigned
//       let deliveryDetail= await DeliveryDetail.findOne({
//         order:orderId
//       });
//       if(deliveryDetail.drone!=droneId){
//         return res.status(400).json({
//           status:"fail",
//           mess:`order ${orderId} isn't assigned to you`
//         });
//       }

//       droneOrderAssignment.delete(orderId);
//       return res.status(200).json({
//         status:"ok",
//         data:deliveryDetail
//       });
//     }

//   }
//   catch(error){
//     next(error, req, res, next);
//   }
// }

exports.refuseDeliveryJob=async (req, res, next)=>{
  try {
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
      let deliveryAssignmentInfo=deliveryAssignmentMap.get(orderId);
      deliveryAssignmentInfo.refuser.push(decodedJWT.accountId);
      selectNextSuitableDeliveryPartner(orderId);
      res.status(200).json({
        status:"ok",
        data:"1"//received refuse request
      });
    }
  } catch (error) {
    next(error, req, res, next);
  }
}

exports.droneRefuseDeliveryJob=async (req, res, next)=>{
  try {
    const {droneId, orderId}=req.body;
    if(droneOrderAssignment.get(orderId).droneId!=droneId){
      return res.status(400).json({
        status:"fail",
        mess:`There is no order ${orderId} assigned to drone ${droneId}`
      });
    }
    else{
      
      clearTimeout(droneOrderAssignment.get(orderId).timeout);
      let droneAssigment=droneOrderAssignment.get(orderId);
      droneAssigment.refuser.push(droneId);
      selectNextSuitablDrone(orderId);
      res.status(200).json({
        status:"ok",
        data:"1"//received refuse request
      });
    }
  } catch (error) {
    next(error, req, res, next);
  }
}

exports.getJobDeliveryNotificationDetail=async(req, res, next)=>{
  try {
    const {jwtToken, orderId}=req.body;
    const decodedJWT=await promisify(jwt.verify)(jwtToken, process.env.JWT_SECRET_KEY);
    let deliveryDetail=await DeliveryDetail.findOne({
      order:orderId
    });
    
    if(deliveryDetail){
      return res.status(400).json({
        status:"fail",
        mess:`The order ${orderId} is already assigned`
      });
    }
    else{
      let order= await Order.findById(orderId)
      .populate({
        path:"seller.sellerId",
        select:"address formattedAddress"
      });

      let ans={
          deliveryCharge:null,
          totalItemMoney:null,
          sellerAddress:{
              formattedAddress:null,
              pos:{
                  lng:null,
                  lat:null
              }
          },
          customerAddress:{
              formattedAddress:null,
              pos:{
                  lng:null,
                  lat:null
              }
          },
          orderId:null
      };
      let sellerDistance={
          "distance": {
              "text": null,
              "value": null
          },
          "duration": {
              "text": null,
              "value": null
          }
      };
      let customerDistance={
          "distance": {
              "text": null,
              "value": null
          },
          "duration": {
              "text": null,
              "value": null
          }
      };
      ans.orderId=orderId;
      //get seller address
      ans.sellerAddress.formattedAddress=order.seller.sellerId.formattedAddress;
      ans.sellerAddress.pos.lat=order.seller.sellerId.address.lat;
      ans.sellerAddress.pos.lng=order.seller.sellerId.address.lng;
      //get customer address
      ans.customerAddress.formattedAddress=order.user.address.street;
      ans.customerAddress.pos.lat=order.user.address.lat;
      ans.customerAddress.pos.lng=order.user.address.lng;
      
      let deliveryPartnerPos=deliveryPartnerMap.get(decodedJWT.accountId).location;
      //get distance from the assigned delivery partner to the seller
      let url=`${process.env.GOONG_DISTANCEMATRIX}?origins=${deliveryPartnerPos.lat},${deliveryPartnerPos.lng}&destinations=${ans.sellerAddress.pos.lat},${ans.sellerAddress.pos.lng}&vehicle=car&api_key=${process.env.GOONG_API_KEY}`;
      let distancesMatrix=await axios.get(`${process.env.GOONG_DISTANCEMATRIX}?origins=${deliveryPartnerPos.lat},${deliveryPartnerPos.lng}&destinations=${ans.sellerAddress.pos.lat},${ans.sellerAddress.pos.lng}&vehicle=car&api_key=${process.env.GOONG_API_KEY}`)
      distancesMatrix=distancesMatrix.data;
      sellerDistance.distance=distancesMatrix.rows[0].elements[0].distance;
      sellerDistance.duration=distancesMatrix.rows[0].elements[0].duration;
      //get distance from the seller partner to the customer
      distancesMatrix=await axios.get(`${process.env.GOONG_DISTANCEMATRIX}?origins=${ans.sellerAddress.pos.lat},${ans.sellerAddress.pos.lng}&destinations=${ans.customerAddress.pos.lat},${ans.customerAddress.pos.lng}&vehicle=car&api_key=${process.env.GOONG_API_KEY}`)
      distancesMatrix=distancesMatrix.data;
      customerDistance.distance=distancesMatrix.rows[0].elements[0].distance;
      customerDistance.duration=distancesMatrix.rows[0].elements[0].duration;
      
      ans.deliveryCharge=parseFloat(process.env.DELIVERY_CHARGE_BASE)+
        parseFloat(process.env.DELIVERY_CHARGE_RATE_PER_KM)*(sellerDistance.distance.value/1000+customerDistance.distance.value/1000);
      //calculate order total item money
      ans.totalItemMoney=order.totalItemMoney;

      return res.status(200).json({
        status:"ok",
        data:ans
      });
    }


  } catch (error) {
    next(error, req, res, next);
    console.log(error);
    return;
  }
}

exports.finishDeliveryJob=async (req, res, next)=>{
  try{
    let {droneId, orderId, travelDistance}=req.body;
    let deliveryDetail=await DeliveryDetail.findOne({
      order:orderId,
      drone:droneId
    });
    if(!deliveryDetail){
      return res.status(400).json({
        status:"fail",
        mess:"something are wrong with order, droneId"
      });
    }
    await DeliveryDetail.populate(deliveryDetail, {
      path:"order",
      select:"user seller",
    });
    // if(orderId!=deliveryDetail.order || droneId!=deliveryDetail.droneId){
    //   return res.status(400).json({
    //     status:"fail",
    //     mess:"something are wrong with order, droneId"
    //   });
    // }
    let order = await Order.findById(orderId).populate("seller.sellerId", "stripeAccountId");

    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found",
      });
    }
    order.status="Completed";

    deliveryDetail.endTime=new Date();
    // deliveryDetail.deliveryCharge=parseInt(process.env.DELIVERY_CHARGE_BASE)+travelDistance*parseInt(process.env.DELIVERY_CHARGE_RATE_PER_KM);//[not done: get actual delivery charge in backend]
    await deliveryDetail.save();

    if (order.status === "Completed" && !order.transferId && order.seller?.sellerId?.stripeAccountId) {
      const total = order.totalItemMoney * 100; // chuyển sang cent
      const amountAfterMinusStripeFee = total - total * 0.029 - 30; // trừ 2.9% + 30¢
      const commission = amountAfterMinusStripeFee * 0.1;
      const sellerAmount = amountAfterMinusStripeFee - commission;

      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(sellerAmount),
          currency: "usd",
          destination: order.seller.sellerId.stripeAccountId,
          description: `Payout cho order ${orderId}`,
          metadata: { orderId: orderId.toString() },
        });

        // Lưu thông tin payout vào order
        order.transferId = transfer.id;
        order.commission = commission / 100;
        order.sellerAmount = sellerAmount / 100;
      } catch (stripeErr) {
        console.error("Lỗi payout Stripe:", stripeErr.message);
        // Không làm hỏng flow chính, nhưng ghi log
        // Có thể gửi thông báo admin sau
      }
    }
    order.isArrived="false";
    let updatedOrder=await order.save();
    io.getIO().emit("orders", { action: "update", order: updatedOrder });   
    //untrack the order assignment
    droneOrderAssignment.delete(orderId);

    let drone=await Drone.findOne({
      droneId:droneId
    });
    drone.status="IDLE";
    await drone.save();

    readyDrone.set(droneId, null);
    busyDrone.delete(droneId);
    
    res.status(200).json({
      status:"ok",
      data:deliveryDetail.toJSON({ virtuals: false })
    });

    //[not done: not message the client about the order update status]

  }
  catch(error){
    next(error, req, res, next);
  }


}

exports.getSellerCoordinate=async (req, res, next)=>{
  try {
    let sellerId=req.params.sellerId;
    let sellerCoordinate=await Seller.findById(sellerId)
    .select("address.lng address.lat");

    if(!sellerCoordinate){
      throw new Error("No seller is found");
    }

    res.status(200).json({
      status:"ok",
      data:sellerCoordinate
    })
    
  } catch (error) {
    next(error, req, res, next);
  }

}

exports.getDeliveryCharge=(req, res, next)=>{
  try {
    let travelDistKM=parseFloat(req.params.travelDistKM);
    let deliveryCharge=parseInt(process.env.DELIVERY_CHARGE_BASE)+travelDistKM*parseInt(process.env.DELIVERY_CHARGE_RATE_PER_KM);
    res.status(200).json({
      status:"ok",
      data:deliveryCharge
    })

  } catch (error) {
    next(error, req, res, next);
  }
}

exports.deliveryArrive=async (req, res, next)=>{
  try {
    //check drone identity
    const {orderId, droneId}=req.body;
    let deliveryDetail=await DeliveryDetail.findOne({
      order:orderId,
      drone:droneId
    });
    if(!deliveryDetail){
      throw new Error("something are wrong with order, droneId");
    }
    await Order.findByIdAndUpdate(
      orderId,
      {
        isArrived:"true"
      }
    );
    res.status(200).json({
      status:"ok"
    })

  } catch (error) {
    next(error, req, res, next);
  }

}