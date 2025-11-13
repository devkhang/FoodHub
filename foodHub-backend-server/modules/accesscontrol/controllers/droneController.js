const mongoose=require("mongoose");
const Drone=require("../models/drone");

//[not done: chua tan dung express-validator]
exports.addDrone=async (req, res)=>{
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

exports.getDrone=async (req, res)=>{
    let droneId=req.params.id;
    if(!droneId){
        return res.status(400).json({
            status:"fail",
            mess:"droneId can't be null"
        });
    }

    let drone=await Drone.findOne({
        droneId:droneId
    });

    if(!drone){
        return res.status(400).json({
            status:"fail",
            mess:"drone doesn't exist"
        });        
    }

    res.status(200).json({
        status:"ok",
        data:drone
    });
}

exports.getAllDrones = async (req, res) => {
  try {
    const drones = await Drone.find().select('-__v');
    res.json({ drones });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách drone' });
  }
};

exports.activateDrone = async (req, res) => {
  try {
    const { droneId } = req.params;

    // Tìm drone inactive
    const drone = await Drone.findOne({ droneId, isActive: false });
    if (!drone) {
      return res.status(404).json({ message: 'Drone không tồn tại hoặc đã hoạt động' });
    }

    drone.isActive = true;
    await drone.save();

    res.json({ message: 'Kích hoạt drone thành công', drone });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server khi kích hoạt drone' });
  }
};

// POST /create - Tạo drone mới
exports.createDrone = async (req, res) => {
  try {
    const { droneId, model, status, homeBase } = req.validatedData;

    // Kiểm tra droneId unique
    const existingDrone = await Drone.findOne({ droneId });
    if (existingDrone) {
      return res.status(400).json({ message: 'DroneId đã tồn tại' });
    }

    const newDrone = new Drone({
      droneId,
      model,
      status: status || 'IDLE',
      homeBase: {
        lat: parseFloat(homeBase.lat),
        lng: parseFloat(homeBase.lng)
      },
      isActive: true
    });

    await newDrone.save();
    res.status(201).json({ message: 'Tạo drone thành công', drone: newDrone });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server khi tạo drone' });
  }
};

// PATCH /:droneId - Cập nhật drone
exports.updateDrone = async (req, res) => {
  try {
    const { droneId } = req.params;
    const { model, status, homeBase } = req.validatedData || req.body; // Fallback nếu không dùng validation

    // Tìm drone active
    const drone = await Drone.findOne({ droneId, isActive: true });
    if (!drone) {
      return res.status(404).json({ message: 'Drone không tồn tại hoặc đã bị vô hiệu hóa' });
    }

    // Cập nhật fields nếu có
    if (model !== undefined) drone.model = model;
    if (status !== undefined) drone.status = status;
    if (homeBase) {
      drone.homeBase.lat = parseFloat(homeBase.lat);
      drone.homeBase.lng = parseFloat(homeBase.lng);
    }

    await drone.save();
    res.json({ message: 'Cập nhật drone thành công', drone });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật drone' });
  }
};

// PATCH /:droneId/deactivate - Vô hiệu hóa drone
exports.deactivateDrone = async (req, res) => {
  try {
    const { droneId } = req.params;

    const drone = await Drone.findOne({ droneId, isActive: true });
    if (!drone) {
      return res.status(404).json({ message: 'Drone không tồn tại hoặc đã bị vô hiệu hóa' });
    }

    drone.isActive = false;
    await drone.save();

    res.json({ message: 'Vô hiệu hóa drone thành công' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server khi vô hiệu hóa drone' });
  }
};