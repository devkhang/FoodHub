const express=require("express");
const droneController=require("../controllers/droneController");

let router=express.Router()

//[not done: only admin can manage drone]
router.post("/AddDrone", droneController.addDrone);
// router.get("/getDrones");
// router.get("/getDrone/:id");
// router.put("/modifyDrone",);


module.exports=router;