const express = require("express");
const { body } = require("express-validator");

const userController = require("../controllers/userController");
const auth = require("../../../middleware/auth");

const router = express.Router();

router.get("/restaurants", userController.getRestaurants);

router.get("/restaurant/:restId", userController.getRestaurant);

router.post("/cart", auth.verifyUser, userController.postCart);
router.delete("/cart", auth.verifyUser, userController.clearCart);
router.get("/cart", auth.verifyUser, userController.getCart);

router.post(
  "/delete-cart-item",
  auth.verifyUser,
  userController.postCartDelete
);

router.post(
  "/remove-cart-item/:itemId",
  auth.verifyUser,
  userController.postCartRemove
);

router.post(
  "/user/address",
  auth.verifyUser,
  [
    body("phoneNo", "Enter a valid 10 digit phone number")
      .trim()
      .isLength({ min: 10, max: 10 }),
    body("street", "Street cannot be empty").trim().not().isEmpty(),
  ],
  userController.postAddress
);

router.get("/user", userController.getLoggedInUser);
router.get("/order/:orderId", userController.getOrderById);
router.post("/order", auth.verifyUser, userController.postOrder);
router.get("/orders", userController.getOrders);

router.post("/order-status/:orderId",userController.postOrderStatus);

router.get("/clients/connected", userController.getConnectedClients);

router.post(
  "/order/create-checkout-session",
  auth.verifyUser,
  [body("orderId", "Order ID không hợp lệ").trim().not().isEmpty().isMongoId()],
  userController.createCheckoutSession
);

router.get("/orders", userController.getOrders);
router.get(
  "/restaurants-location/:lat/:lng",
  userController.getRestaurantsByAddress
);
router.get("/order/getAllOrders", userController.getAllOrders);
router.post(
  "/verify-session",
  auth.verifyUser,
  body("session_id", "Session ID không hợp lệ").trim().not().isEmpty(),
  userController.verifySession
);

module.exports = router;
