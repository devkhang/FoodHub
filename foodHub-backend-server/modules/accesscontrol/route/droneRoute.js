const express=require("express");
const droneController=require("../controllers/droneController");
const validation = require("../../../middleware/DroneValidation")
const Drone = require("../../accesscontrol/models/drone");
let router=express.Router()


router.get('/getAll', droneController.getAllDrones);
//[not done: only admin can manage drone]
router.post("/AddDrone",validation.validateCreateDrone,droneController.addDrone);
// router.get("/getDrones", );
router.get("/getDrone/:id", droneController.getDrone);
// router.put("/modifyDrone",);
// PATCH /api/drone/:droneId - Với validation riêng + middleware chung check exists
router.patch('/:droneId', validation.checkDroneExists, validation.validateUpdateDrone, droneController.updateDrone);

// PATCH /api/drone/:droneId/deactivate - Chỉ middleware chung check exists
router.patch('/:droneId/deactivate', validation.checkDroneExists, droneController.deactivateDrone);

router.patch('/:droneId/activate', async (req, res, next) => {
  const { droneId } = req.params;
  const drone = await Drone.findOne({ droneId, isActive: false });
  if (!drone) {
    return res.status(404).json({ message: 'Drone không tồn tại hoặc đã hoạt động' });
  }
  req.drone = drone; // Tương tự checkDroneExists
  next();
}, droneController.activateDrone);

module.exports=router;