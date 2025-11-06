const socket = require("../../util/socket");
const {init, getIO}=require("../../util/socket");
const deliveryPartnerMap=require("../sources/DeliveryPartnerSource");
const jwt=require("jsonwebtoken");
const {verifyJWT}=require("../../util/jwtUtil");
const {availableDrones, socketToDrone}=require("../sources/droneSource");

exports.droneUpdatePositionHandler=()=>{
    //[not done: not handle free, busy drone yet]
    const IO=getIO();
    IO.on("connection",(socket)=>{
        socket.on("drone:updatePosition", ({droneId, lng, lat})=>{
            
            let drone=availableDrones.get(droneId);
            if(!drone){
                return;
            }
            console.log("receive drone position:", droneId, lng, lat);
            drone.location={
                lng:lng,
                lat:lat
            };
            console.log(availableDrones);
        });

    });
}

exports.droneSocketRegistration=()=>{
    const IO=getIO();
    IO.on("connection",(socket)=>{
        socket.on("drone:registerSocket", (droneId)=>{
            console.log("drone socket registration:", droneId, socket.id);
            availableDrones.set(droneId,{
                socketId:socket.id
            });
            socketToDrone.set(socket.id, droneId);
        });

    });


}

exports.droneCutConnection=()=>{
    const IO=getIO();
    IO.on("connection",(socket)=>{
        socket.on("disconnect", (reason) => {
            console.log(`socket ${socket.io} disconnted, reason: ${reason}`);
            let droneId=socketToDrone.get(socket.id);
            availableDrones.delete(droneId);
            socketToDrone.delete(socket.id);
            socket.disconnect(true);
        });

    });    
}