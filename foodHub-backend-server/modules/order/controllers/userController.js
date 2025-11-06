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

//socket
const DeliveyPartnerSocketMap = require("../../../socket/sources/DeliveryPartnerSource");
const { getIO } = require("../../../util/socket");
const { getObjectNearAPlace } = require("../../../util/delivery");
const order = require("../models/order");
const deliveryPartnerMap = require("../../../socket/sources/DeliveryPartnerSource");
const deliveryAssignmentMap = require("../../../socket/sources/DeliveryAssignmentMap");

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
      res.status(200).json({ message: "Item successfully added to cart." });
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
  const locality = req.body.locality;
  const aptName = req.body.aptName;
  const zip = req.body.zip;
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
            locality: locality,
            zip: zip,
            phoneNo: phoneNo,
            aptName: aptName,
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

exports.postOrder = (req, res, next) => {
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

  Account.findById(accountId)
    .then((account) => {
      if (account.role === "ROLE_USER")
        return User.findOne({ account: account._id });
      if (account.role === "ROLE_SELLER")
        return Seller.findOne({ account: account._id });
    })
    .then((result) => {
      if (result instanceof User)
        return Order.find({ "user.userId": result._id }).sort({
          createdAt: -1,
        });
      if (result instanceof Seller)
        return Order.find({ "seller.sellerId": result._id }).sort({
          createdAt: -1,
        });
    })
    .then((orders) => {
      res.status(200).json({ orders });
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
      let ans = getObjectNearAPlace(
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
        deliveryAssignment ? deliveryAssignment.refuser : []
      );
      console.log("Suitable driver:", ans);
      //check if this order is assgined before
      if (!deliveryAssignment) {
        deliveryAssignmentMap.set(orderId, {
          accountId: ans.id,
          timeout: setTimeout(() => {
            selectNextSuitableDeliveryPartner(orderId);
          }, (process.env.DELIVERY_JOB_ACCEPT_TIMEOUT + 2 * process.env.NETWORK_DELAY) * 1000),
          count: 0,
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
        deliveryAssignment.accountId = ans.id;
        deliveryAssignment.timeout = setTimeout(() => {
          selectNextSuitableDeliveryPartner(orderId);
        }, (process.env.DELIVERY_JOB_ACCEPT_TIMEOUT + 2 * process.env.NETWORK_DELAY) * 1000);
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
exports.selectNextSuitableDeliveryPartner = selectNextSuitableDeliveryPartner;

exports.postOrderStatus = (req, res, next) => {
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

  const orderId = req.params.orderId;
  if (!req.body.status) {
    const error = new Error("Status Not Provided");
    error.statusCode = 404;
    throw error;
  }
  const status = req.body.status;
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        const error = new Error(
          "Could not find any Order with the given orderId"
        );
        error.statusCode = 404;
        throw error;
      }

      order.status = status;
      return order.save();
    })
    .then((updatedOrder) => {
      io.getIO().emit("orders", { action: "update", order: updatedOrder });
      if (status == "Ready") {
        selectNextSuitableDeliveryPartner(orderId);
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

  Seller.find()
    .populate("account", "isVerified")
    .sort({ createdAt: -1 })
    .then((sellers) => {
      const sellersVerified = sellers.filter((restaurant) => {
        if (restaurant.account) console.error("yes");
        else console.error("no");

        return restaurant.account.isVerified === true;
      });

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
        if (d < 10) result.push(seller);

        return result;
      }, []);

      return sellersFinal;
    })
    .then((results) => {
      res.status(200).json({
        restaurants: results,
        totalItems: results.length,
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
      .populate("seller.sellerId", "name imageUrl")
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
