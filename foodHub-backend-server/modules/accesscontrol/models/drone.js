mongoose=require("mongoose");

const DroneSchema = new mongoose.Schema({
  droneId:{ type: String, unique: true },   // "DRN-001"
  model:{
    type:String
  },
  status:{ 
    type: String, 
    enum: ['IDLE','BUSY'],
    default:'IDLE'
},
  homeBase:{
    lng:{
        required:[true, "homebase cant be null"],
        type:Number
    },
    lat:{
        required:[true, "homebase cant be null"],
        type:Number
    }
  },
  isActive:{ type: Boolean, default: true }
}, { timestamps: true });

let Drone=mongoose.model("Drone", DroneSchema);
module.exports=Drone