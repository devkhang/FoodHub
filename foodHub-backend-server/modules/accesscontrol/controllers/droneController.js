const mongoose=require("mongoose");
const Drone=require("../models/drone");

//[not done: chua tan dung express-validator]
exports.addDrone=async (req, res, next)=>{
    let droneInfo=req.body;

    if(!droneInfo.droneId){
        return res.status(400).json({
            status:"fail",
            message:"droneId can't be null"
        })        
    }
    if(!droneInfo.homeBase.lng || !droneInfo.homeBase.lat){
        return res.status(400).json({
            status:"fail",
            message:"Plese provide the coordinate of home base"
        });
    }    

    let drone=await Drone.findOne({
        droneId:droneInfo.droneId
    });
    if(drone){
        return res.status(400).json({
            status:"fail",
            message:"This drone already exist"
        })
    }
    drone=await Drone.create(droneInfo);
    return res.status(200).json({
        status:"ok",
        data:drone
    })

}