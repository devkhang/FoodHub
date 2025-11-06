const socket = require("../../util/socket");
const {init, getIO}=require("../../util/socket");
const deliveryPartnerMap=require("../sources/DeliveryPartnerSource");
const jwt=require("jsonwebtoken");
const {verifyJWT}=require("../../util/jwtUtil");
const {availableDrones}=require("../sources/droneSource");

exports.droneUpdatePositionHandler=()=>{
    //[not done: not handle free, busy drone yet]
    const IO=getIO();
    IO.on("connection",(socket)=>{
        socket.on("drone:updatePosition", ({droneId, lng, lat})=>{
            console.log("receiv drone position:", droneId, lng, lat);
            
            availableDrones.set(droneId,{
                lng:lng,
                lat:lat
            });
            console.log(availableDrones);
        });

    });
}