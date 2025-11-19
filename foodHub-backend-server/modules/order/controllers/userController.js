const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
var mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config(path.join(__dirname, ".env"));

const Seller = require("../../accesscontrol/models/seller");
const Item = require("../../menu/models/item");
const User = require("../../accesscontrol/models/user");
const Account = require("../../accesscontrol/models/account");
const Order = require("../models/order");
const io = require("../../../util/socket");
const app = require("../../../app");
const DeliveryPartner = require("../../accesscontrol/models/deliveryPartner");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const APIQueryFeatures=require("../../../util/APIQueryFeatures");

//socket
const DeliveyPartnerSocketMap = require("../../../socket/sources/DeliveryPartnerSource");
const { getIO } = require("../../../util/socket");
const { getClosestObjectBetweenOriginDest } = require("../../../util/delivery");
const order = require("../../order/models/order");
const deliveryPartnerMap = require("../../../socket/sources/DeliveryPartnerSource");
const deliveryAssignmentMap=require("../../../socket/sources/DeliveryAssignmentMap");
const {availableDrones, readyDrone, busyDrone, droneOrderAssignment}=require("../../../socket/sources/droneSource");
const DeliveryDetail = require("../../Delivery/models/deliveryDetail");

exports.getRestaurants = (req, res, next) => {
  Seller.find()
    .populate("account", "isVerified")
    .sort({ createdAt: -1 })
    .then((sellers) => {
      const sellersFinal = sellers.filter((restaurant) => {
        return restaurant.account.isVerified === true;
      });
      res.status(200).json({
        restaurants: sellersFinal,
        totalItems: sellersFinal.length,
      });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

// exports.getRestaurants = (req, res, next) => {
//   const currentPage = req.query.page || 1;
//   const perPage = 6;
//   let totalItems;
//   Seller.find()
//     .countDocuments()
//     .then((totalCount) => {
//       totalItems = totalCount;

//       return Seller.find().sort({ createdAt: -1 });
//       // .skip((currentPage - 1) * perPage)
//       // .limit(perPage);
//     })
//     .then((sellers) => {
//       res.status(200).json({
//         restaurants: sellers,
//         totalItems: totalItems,
//       });
//     })
//     .catch((err) => {
//       if (!err.statusCode) err.statusCode = 500;
//       next(err);
//     });
// };

exports.postCart = (req, res, next) => {
  const itemId = req.body.itemId;
  let targetItem;
  if (!itemId) {
    const error = new Error("ItemId not provided");
    error.statusCode = 404;
    throw error;
  }
  Item.findById(itemId)
    .then((item) => {
      targetItem = item;
      return Account.findById(req.loggedInUserId);
    })
    .then((account) => {
      return User.findOne({ account: account._id });
    })
    .then((user) => {
      return user.addToCart(targetItem);
    })
    .then((result) => {
      return res.status(200).json({ message: "Item successfully added to cart." });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.getCart = (req, res, next) => {
  Account.findById(req.loggedInUserId)
    .then((account) => {
      return User.findOne({ account: account._id });
    })
    .then((user) => {
      return user.populate("cart.items.itemId").execPopulate();
    })
    .then((user) => {
      const cartItems = user.cart.items;
      let totalPrice = 0;
      cartItems.forEach((item) => {
        totalPrice = totalPrice + item.quantity * item.itemId.price;
      });
      res.json({ cart: cartItems, totalPrice: totalPrice });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.postCartDelete = (req, res, next) => {
  const itemId = req.body.itemId;
  if (!itemId) {
    const error = new Error("ItemId not provided");
    error.statusCode = 404;
    throw error;
  }
  Account.findById(req.loggedInUserId)
    .then((account) => {
      return User.findOne({ account: account._id });
    })
    .then((user) => {
      return user.removeFromCart(itemId);
    })
    .then((result) => {
      res.status(200).json({ message: "Item successfully removed from cart." });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.postCartRemove = (req, res, next) => {
  const itemId = req.params.itemId;
  if (!itemId) {
    const error = new Error("ItemId not provided");
    error.statusCode = 404;
    throw error;
  }
  Account.findById(req.loggedInUserId)
    .then((account) => {
      return User.findOne({ account: account._id });
    })
    .then((user) => {
      return user.reduceQuantity(itemId);
    })
    .then((result) => {
      res.status(200).json({ message: "Item successfully updated." });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.getRestaurant = (req, res, next) => {
  const restId = req.params.restId;
  Seller.findById(restId)
    .populate("items")
    // .then((seller) => {
    //   return Item.find({ _id: { $in: seller.items } });
    // })
    .then((restaurant) => {
      res.json({ result: restaurant });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.postAddress = (req, res, next) => {
  // const errorFormatter = ({ location, msg, param, value, nestedErrors }) => {
  //   // Build your resulting errors however you want! String, object, whatever - it works!
  //   return `${param}: ${msg}`;
  // };
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation Failed, Incorrect data entered.");
    error.statusCode = 422;
    error.errors = errors.array();
    throw error;
  }

  const phoneNo = req.body.phoneNo;
  const street = req.body.street;
  const lat = req.body.lat;
  const lng = req.body.lng;
  const formattedAddress = req.body.formattedAddress;

  Account.findById(req.loggedInUserId)
    .then((account) => {
      return User.findOne({ account: account._id });
    })
    .then((user) => {
      return User.findByIdAndUpdate(
        { _id: user._id },
        {
          address: {
            street: street,
            phoneNo: phoneNo,
            lat: lat,
            lng: lng,
          },
          formattedAddress: formattedAddress,
        },
        { new: true }
      );
    })
    .then((result) => {
      res.json({ item: result });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.getLoggedInUser = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    const error = new Error("Not authenticated");
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }
  if (!decodedToken) {
    const error = new Error("Not authenticated");
    error.statusCode = 401;
    throw error;
  }

  const accountId = decodedToken.accountId;
  let accountObj;
  let sellerObj;
  console.log("Account id", accountId);

  Account.findById(accountId)
    .then((account) => {
      if (!account) {
        const error = new Error("Internal server error");
        error.statusCode = 500;
        throw error;
      }
      accountObj = account;
      return User.findOne({ account: account._id }).populate({
        path: "account",
        select: ["email", "role"],
      });
    })
    .then((user) => {
      if (user) {
        return user;
      } else {
        return Seller.findOne({ account: accountObj._id })
          .populate("items")
          .populate({ path: "account", select: ["email", "role"] });
      }
    })
    .then((seller) => {
      if (seller) {
        return seller;
      } else {
        return DeliveryPartner.findOne({ account: accountObj._id }).populate({
          path: "account",
          select: ["email", "role"],
        });
      }
    })
    .then((result) => {
      res.json({ result });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.verifySession = async (req, res) => {
  try {
    const { session_id } = req.body;
    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.json({ paid: session.payment_status === "paid" });
  } catch (error) {
    console.error("Lỗi verify:", error);
    res.status(500).json({ message: "Lỗi verify session" });
  }
};

exports.postOrder = (req, res, next) => {
  const sessionId = req.body.session_id; // ← LẤY session_id
  if (!sessionId) {
    const error = new Error("Thiếu session_id");
    error.statusCode = 400;
    return next(error);
  }
  let accountObj;
  let userObj;
  Account.findById(req.loggedInUserId)
    .then((account) => {
      accountObj = account;
      return User.findOne({ account: account._id });
    })
    .then((user) => {
      userObj = user;
      return user.populate("cart.items.itemId").execPopulate();
    })
    .then((result) => {
      const sellers = result.cart.items.reduce((acc, item) => {
        if (!acc[item.itemId.creator]) {
          acc[item.itemId.creator] = [];
        }

        acc[item.itemId.creator].push(item);
        return acc;
      }, {});

      for (let [seller, cartItem] of Object.entries(sellers)) {
        Seller.findById(seller).then((seller) => {
          const items = cartItem.map((i) => {
            return { quantity: i.quantity, item: { ...i.itemId._doc } };
          });
          const order = new Order({
            user: {
              email: accountObj.email,
              name: result.firstName,
              address: result.address,
              userId: result,
            },
            items: items,
            status: "Placed",
            seller: {
              name: seller.name,
              phone: seller.address.phoneNo,
              sellerId: seller,
            },
            sessionId,
          });

          order.save();
          for (const clientId of Object.keys(app.clients)) {
            // console.log(app.clients[clientId].socket);
            if (clientId.toString() === seller._id.toString()) {
              io.getIO().sockets.connected[app.clients[clientId].socket].emit(
                "orders",
                { action: "create", order: order }
              );
            }
          }
        });
      }
      return result;
    })
    .then((result) => {
      return userObj.clearCart();
    })
    .then((result) => {
      res.status(200).json({ result });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.getOrders = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    const error = new Error("Not authenticated");
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }
  if (!decodedToken) {
    const error = new Error("Not authenticated");
    error.statusCode = 401;
    throw error;
  }

  const accountId = decodedToken.accountId;
  let totalPage;

  Account.findById(accountId)
    .then((account) => {
      if (account.role === "ROLE_USER")
        return User.findOne({ account: account._id });
      if (account.role === "ROLE_SELLER")
        return Seller.findOne({ account: account._id });
    })
    .then(async (result) => {
      let query;
      let limit=req.query.limit*1 || 1;
      let orders;
      if (result instanceof User){
        totalPage=await Order.find({ "user.userId": result._id });
        totalPage=Math.ceil(totalPage.length/limit);

        query=Order.find({ "user.userId": result._id }).sort({
          createdAt: -1,
        });
        let features=new APIQueryFeatures(query, req.query, User);
        features.sorting();
        await features.pagination()
        return query;
      }
      if (result instanceof Seller){
        totalPage=await Order.find({ "seller.sellerId": result._id });
        totalPage=Math.ceil(totalPage.length/limit);

        query=Order.find({ "seller.sellerId": result._id }).sort({
          createdAt: -1,
        });
        let features=new APIQueryFeatures(query, req.query, Seller);
        features.sorting();
        await features.pagination()
        return query;
      }
      return orders
      
    })
    .then(async (orders) => {
      let result=[];
      for(let order of orders){
        let objOrder=order.toObject();
        let deliveryDetail=await DeliveryDetail.findOne({
          order:order._id
        })
        .select("drone");
        if(deliveryDetail){
          objOrder.droneId=deliveryDetail.drone;
        }
        result.push(objOrder);
      }
      res.status(200).json({
        orders:result,
        totalPage:totalPage
      });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

//HERE HERE HERE HERE
function selectNextSuitableDeliveryPartner(orderId) {
  //find order information
  let order = Order.findById(orderId)
    .populate({
      path: "seller.sellerId",
      select: "address",
    })
    .then((order) => {
      //find suitable delivery partner
      let deliveryAssignment = deliveryAssignmentMap.get(orderId);
      if (
        deliveryAssignment &&
        deliveryAssignment.count > process.env.MAX_ASSIGNMENT_ATTEMP
      ) {
        //[not done]cancel order, cause found no suitable delivery partner
        console.log(
          `order ${orderId} will be cancelled, cause found no suitable delivery partner`
        );
        deliveryAssignmentMap.delete(orderId);
        return;
      }

      let ans = getClosestObjectBetweenOriginDest(
        {
          lng: order.seller.sellerId.address.lng,
          lat: order.seller.sellerId.address.lat,
        },
        Array.from(deliveryPartnerMap.entries()).map(([id, info]) => {
          return {
            id: id,
            pos: info.location,
          };
        }),
        parseInt(process.env.DISTANCE_ACCEPTED_RANGE),
        parseInt(process.env.MAX_DISTANCE_ACCEPTED_RANGE),
        deliveryAssignment ? deliveryAssignment.refuser : []
      );
      if (!ans) {
        if (deliveryAssignment) {
          deliveryAssignment.count += 1;
        } else {
          deliveryAssignmentMap.set(orderId, {
            count: 1,
          });
        }
        return selectNextSuitableDeliveryPartner(orderId);
      }
      console.log("Suitable driver:", ans);
      //check if this order is assgined before
      if (!deliveryAssignment) {
        deliveryAssignmentMap.set(orderId, {
          accountId: ans ? ans.id : null,
          timeout: setTimeout(() => {
            selectNextSuitableDeliveryPartner(orderId);
          }, (parseInt(process.env.DELIVERY_JOB_ACCEPT_TIMEOUT) + 2 * parseInt(process.env.NETWORK_DELAY)) * 1000),
          count: 1,
          refuser: [],
        });
      } else {
        if (deliveryAssignment.count > process.env.MAX_ASSIGNMENT_ATTEMP) {
          //[not done]cancel order, cause found no suitable delivery partner
          console.log(
            `order ${orderId} will be cancelled, cause found no suitable delivery partner`
          );
          deliveryAssignmentMap.delete(orderId);
          return;
        }
        deliveryAssignment.accountId = ans ? ans.id : null;
        deliveryAssignment.timeout = setTimeout(() => {
          selectNextSuitableDeliveryPartner(orderId);
        }, (parseInt(process.env.DELIVERY_JOB_ACCEPT_TIMEOUT) + 2 * parseInt(process.env.NETWORK_DELAY)) * 1000);
        deliveryAssignment.count += 1;
      }
      const deliveryPartnerSocket = deliveryPartnerMap.get(ans.id).socketId;
      const io = getIO();
      io.to(deliveryPartnerSocket).emit("delivery:job_notification", {
        orderId: orderId,
        timeout: process.env.DELIVERY_JOB_ACCEPT_TIMEOUT,
      });
    });
}

const CancelOrderCauseNoSuitableDrone = async (orderId) => {
  droneOrderAssignment.delete(orderId);
  let updatedOrder = await Order.findById(orderId);
  updatedOrder.status = "Cancelled";
  updatedOrder = await updatedOrder.save();
  io.getIO().emit("orders", { action: "update", order: updatedOrder });
};

async function selectNextSuitablDrone(orderId) {
  //find order information
  let order = Order.findById(orderId)
    .populate({
      path: "seller.sellerId",
      select: "address",
    })
    .then(async (order) => {
      //find suitable delivery partner
      let droneAssigment = droneOrderAssignment.get(orderId);
      if (
        droneAssigment &&
        droneAssigment.count > process.env.MAX_ASSIGNMENT_ATTEMP
      ) {
        //[not done: duplicated logic at 2 other places]
        //[not done]cancel order, cause found no suitable delivery partner
        console.log(
          `order ${orderId} will be cancelled, cause found no suitable delivery partner`
        );
        // droneOrderAssignment.delete(orderId);
        // let updatedOrder=await Order.findOneAndUpdate({
        //   orderId:orderId
        // },{
        //   status:"Cancelled"
        // },{
        //   new:true
        // });
        // io.getIO().emit("orders", { action: "update", order: updatedOrder });
        CancelOrderCauseNoSuitableDrone(orderId);

        return;
      }

      //no available drone
      if (availableDrones.size === 0) {
        //[not done]cancel order, cause found no suitable delivery partner
        console.log(
          `order ${orderId} will be cancelled, cause found no suitable delivery partner`
        );
        // droneOrderAssignment.delete(orderId);
        // let updatedOrder=await Order.findOneAndUpdate({
        //   orderId:orderId
        // },{
        //   status:"Cancelled"
        // },{
        //   new:true
        // });
        // io.getIO().emit("orders", { action: "update", order: updatedOrder });
        CancelOrderCauseNoSuitableDrone(orderId);

        return;
      }

      let ans = getClosestObjectBetweenOriginDest(
        {
          lng: order.seller.sellerId.address.lng,
          lat: order.seller.sellerId.address.lat,
        },
        Array.from(readyDrone.entries()).map(([id, info]) => {
          return {
            id: id,
            pos: availableDrones.get(id).location,
          };
        }),
        {
          // lng: order.user.address.lng,
          // lat: order.user.address.lat,
          lng: null,
          lat: null,
        },
        parseInt(process.env.DISTANCE_ACCEPTED_RANGE),
        parseInt(process.env.MAX_DISTANCE_ACCEPTED_RANGE),
        droneAssigment ? droneAssigment.refuser : []
      );

      //if not suitable drone exist
      if (!ans) {
        if (droneAssigment) {
          droneAssigment.count += 1;
        } else {
          droneOrderAssignment.set(orderId, {
            count: 1,
          });
        }
        //retry after a certain amount of type if no suitable drone is found
        return setTimeout(() => {
          selectNextSuitablDrone(orderId);
        }, parseInt(process.env.NO_SUITABLE_DRONE_RETRY) * 1000);
      }
      console.log("Suitable driver:", ans);

      //if suitable drone exists
      //check if this order is assgined before
      if (!droneAssigment) {
        droneOrderAssignment.set(orderId, {
          droneId: ans ? ans.id : null,
          timeout: setTimeout(() => {
            selectNextSuitablDrone(orderId);
          }, (parseInt(process.env.DELIVERY_JOB_ACCEPT_TIMEOUT) + 2 * parseInt(process.env.NETWORK_DELAY)) * 1000),
          count: 1,
          refuser: [],
        });
      } else {
        if (droneAssigment.count > process.env.MAX_ASSIGNMENT_ATTEMP) {
          //[not done]cancel order, cause found no suitable delivery partner
          console.log(
            `order ${orderId} will be cancelled, cause found no suitable delivery partner`
          );
          // droneOrderAssignment.delete(orderId);
          // let updatedOrder=await Order.findOneAndUpdate({
          //   orderId:orderId
          // },{
          //   status:"Cancelled"
          // },{
          //   new:true
          // });
          // io.getIO().emit("orders", { action: "update", order: updatedOrder });
          CancelOrderCauseNoSuitableDrone(orderId);

          return;
        }
        droneAssigment.droneId = ans ? ans.id : null;
        droneAssigment.timeout = setTimeout(() => {
          selectNextSuitablDrone(orderId);
        }, (parseInt(process.env.DELIVERY_JOB_ACCEPT_TIMEOUT) + 2 * parseInt(process.env.NETWORK_DELAY)) * 1000);
        droneAssigment.count += 1;
      }
      const selectedDroneSocket = availableDrones.get(ans.id).socketId;
      const io = getIO();
      io.to(selectedDroneSocket).emit("delivery:job_notification", {
        orderId: orderId,
        timeout: process.env.DELIVERY_JOB_ACCEPT_TIMEOUT,
      });
    });
}

exports.selectNextSuitableDeliveryPartner = selectNextSuitableDeliveryPartner;
exports.selectNextSuitablDrone = selectNextSuitablDrone;

exports.postOrderStatus = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    const error = new Error("Not authenticated");
    error.statusCode = 401;
    throw error;
  }
  //[not done: postOrderStatus ko co quyen cap nhat status thanh complete]


  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }
  if (!decodedToken) {
    const error = new Error("Not authenticated");
    error.statusCode = 401;
    throw error;
  }

  const accountId = decodedToken.accountId;

  const orderId = req.params.orderId;
  if (!req.body.status) {
    const error = new Error("Status Not Provided");
    error.statusCode = 404;
    throw error;
  }
  const status = req.body.status;
  Order.findById(orderId)
    .populate("seller.sellerId")
    .then((order) => {
      if (!order) {
        const error = new Error(
          "Could not find any Order with the given orderId"
        );
        error.statusCode = 404;
        throw error;
      }
      // Branch payout nếu status === 'Completed' (tích hợp từ changeOrderStatus, dùng .then() nested)
      if (status === "Completed" && !order.transferId) {
        const total = order.totalItemMoney * 100;
        const amountAfterminusStripeFee = total - total * 0.029 + 0.3;
        const commission = amountAfterminusStripeFee * 0.1;
        const sellerAmount = amountAfterminusStripeFee - commission;
        // Tạo Stripe transfer (Promise chain)
        return stripe.transfers
          .create({
            amount: Math.round(sellerAmount),
            currency: "usd",
            destination: order.seller.sellerId.stripeAccountId,
            description: `Payout cho order ${orderId}`,
            metadata: { orderId: orderId.toString() },
          })
          .then((transfer) => {
            // Lưu vào order (trong chain)
            order.transferId = transfer.id;
            order.commission = commission / 100;
            order.sellerAmount = sellerAmount / 100;
            return order; // Trả về order đã cập nhật để chain tiếp
          })
          .catch((stripeErr) => {
            // Xử lý lỗi payout (không crash, chỉ log và throw để rollback)
            console.error("Lỗi payout Stripe:", stripeErr.message);
            const error = new Error("Payout thất bại, thử lại sau");
            error.statusCode = 500;
            throw error;
          });
      } else {
        // Không payout, trả về order gốc
        return order;
      }
    })
    .then((order) => {
      order.status = status;
      return order.save();
    })
    .then((updatedOrder) => {
      io.getIO().emit("orders", { action: "update", order: updatedOrder });
      if(status==="Ready"){
        // selectNextSuitableDeliveryPartner(orderId);
        selectNextSuitablDrone(orderId);
      }
      else if(status==="Out For Delivery"){
        let droneSocketId=droneOrderAssignment.get(orderId).droneId;
        droneSocketId=availableDrones.get(droneSocketId).socketId;
        io.getIO().to(droneSocketId).emit("order_hand_over",{
          handOverOrderId:orderId
        });
      }
      res.status(200).json({ updatedOrder });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.getConnectedClients = (req, res, next) => {
  res.json({ clients: app.clients });
};

exports.getRestaurantsByAddress = (req, res, next) => {
  const lat1 = req.params.lat;
  const lon1 = req.params.lng;

  let isFirst=req.query.first;
  let isLast=req.query.last;
  let page=req.query.page*1 || 1;//(1)
  let limit=req.query.limit*1 || parseInt(process.env.MAX_ITEM_PER_PAGE);//(2)
  let skip=(page-1)*limit;
  let totalPage;
  let storeName=req.query.storeName;
  let queryObj={};
  if(storeName){
    queryObj.name={
      $regex:storeName
    }
  }

  Seller.find(queryObj)
    .populate("account", "isVerified")
    .sort({ createdAt: -1 })
    .then((sellers) => {
      const sellersVerified = sellers.filter((restaurant) => {
        // if (restaurant.account) console.error("yes");
        // else console.error("no");

        return restaurant.account.isVerified === true;
      });

      if(sellersVerified.length==0){
        throw new Error("NO_SUITABLE_SELLER");
      }

      const sellersFinal = sellersVerified.reduce((result, seller) => {
        const lat2 = seller.address.lat;
        const lon2 = seller.address.lng;

        const R = 6371; // kms
        const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const d = R * c; // in km
        if (d < process.env.MAX_RESTAURANT_ACCEPT_RANGE*1) result.push(seller);

        return result;
      }, []);

      totalPage=sellersFinal.length/(process.env.MAX_ITEM_PER_PAGE*1);
      totalPage=Math.ceil(totalPage);

      if(isFirst){
        skip=0;
      }
      else if(isLast){
        skip=sellersFinal.length-limit;
        skip=(skip>0)?skip:0;
      }

      if(skip>= sellersFinal.length){
          // return res.status(400).json({
          //   status:"fail",
          //   message:"this page doesn't exist"
          // });
          throw new Error("PAGE_DONT_EXIST");
      }
      let sellersFinalForPage=[]
      //[not done: this code is inefficient]
      // hints: use index for faster seller retrieval
      for(let seller of sellersFinal){
        if(skip){
          --skip;
        }
        else{
          if(limit){  
            sellersFinalForPage.push(seller);
            --limit;
          }
          else{
            break;
          }
        }
      }
      
      return sellersFinalForPage;
    })
    .then((results) => {

      return res.status(200).json({
        restaurants: results,
        totalItems: results.length,
        totalPage:totalPage
      });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.getAllOrders = async (req, res, next) => {
  try {
    // 2. Lấy tất cả đơn hàng
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("user.userId", "firstName lastName phone")
      .populate("seller.sellerId", "name imageUrl");
    // .lean();

    // 3. Tính tổng tiền
    const result = orders.map((order) => {
      return {
        ...order,
        totalItemMoney: order.totalItemMoney || 0,
      };
    });

    // 4. Trả về
    res.status(200).json({
      success: true,
      total: result.length,
      orders: result,
    });
  } catch (err) {
    console.error("Lỗi lấy đơn hàng:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/*
B->A
B:
const resultA=0; //A()
...tinha toan dua tren resultA
*/

exports.createCheckoutSession = async (req, res) => {
  try {
    const { items, total, deliveryCharge } = req.body;
    const userId = req.loggedInUserId;
    // const deliveryCharge = 1.5;
    console.log("total :", total);
    // Không cần tìm order → BỎ findOne

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Giỏ hàng trống!" });
    }

    //them delivery charge nhu la mot lineItem
    const lineItems = items.map((it) => {
      if (!it.itemId) throw new Error("Thiếu itemId");
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: it.title,
            metadata: { itemId: it.itemId }, // ← string ID
          },
          unit_amount: Math.round(it.price),
        },
        quantity: it.quantity,
      };
    });

    if (deliveryCharge > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "delivery charge" },
          unit_amount: Math.round(deliveryCharge * 100),
        },
        quantity: 1,
      });
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.origin}/orders?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cart`,
      metadata: { userId: userId.toString() },
    });
    res.json({ sessionUrl: session.url });
  } catch (e) {
    console.error("Lỗi tạo session:", e.message);
    res.status(500).json({ message: e.message });
  }
};
exports.clearCart = (req, res, next) => {
  let accountObj;
  let userObj;
  Account.findById(req.loggedInUserId)
    .then((account) => {
      accountObj = account;
      return User.findOne({ account: account._id });
    })
    .then((user) => {
      user.clearCart();
      return res.status(200).json({
        status:"ok",
      })
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

