const express = require("express");
const router = express.Router();
// deliveryControllers = { getFullDeliveryChainMiddleware: [Function] }
const deliveryControllers = require('../controllers/deliveryController'); 
const auth = require("../../../middleware/auth")

// Gọi hàm qua tên thuộc tính object (Đã đúng)
router.get("/debug",(req, res)=>{
    res.status(200).json({
        mess:"hello"
    })
});
router.get("/getOrderDetail/:accountId", deliveryControllers.getFullDeliveryChainMiddleware);
router.post('/create-detail', deliveryControllers.createDeliveryDetailMiddleware);
router.post("/accept-delivery-job", deliveryControllers.acceptDeliveryJob);
router.post("/getJobDeliveryNotificationDetail", deliveryControllers.getJobDeliveryNotificationDetail);
router.post("/refuseDeliveryJob", deliveryControllers.refuseDeliveryJob);
router.post("/drone-refuse-job",deliveryControllers.droneRefuseDeliveryJob);
router.post("/drone-accept-job", deliveryControllers.droneAcceptDeliveryJob);
router.put("/finishDeliveryJob", deliveryControllers.finishDeliveryJob);
router.get("/get-seller-coordinate/:sellerId", auth.verifyUser, deliveryControllers.getSellerCoordinate);
router.get("/get-delivery-charge/:travelDistKM", auth.verifyUser, deliveryControllers.getDeliveryCharge)
router.put("/delivery-arrive",deliveryControllers.deliveryArrive);

module.exports = router; 