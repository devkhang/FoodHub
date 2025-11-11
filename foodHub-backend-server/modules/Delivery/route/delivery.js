const express = require("express");
const router = express.Router();
// deliveryControllers = { getFullDeliveryChainMiddleware: [Function] }
const deliveryControllers = require('../controllers/deliveryController'); 
const auth = require("../../../middleware/auth")

// Gọi hàm qua tên thuộc tính object (Đã đúng)
router.get("/getOrderDetail/:accountId",deliveryControllers.getFullDeliveryChainMiddleware);
router.post('/create-detail', deliveryControllers.createDeliveryDetailMiddleware);
router.post("/accept-delivery-job", deliveryControllers.acceptDeliveryJob);
module.exports = router;