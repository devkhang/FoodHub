const {init, getIO}=require("../../util/socket");
const {availableDrones, socketToDrone, busyDrone, readyDrone}=require("../sources/droneSource");
const Drone=require("../../modules/accesscontrol/models/drone");


exports.droneUpdatePositionHandler=()=>{
    //[not done: not handle free, busy drone yet]
    const IO=getIO();
    IO.on("connection",(socket)=>{
        socket.on("drone:updatePosition", ({droneId, lng, lat, status})=>{
            
            let drone=availableDrones.get(droneId);
            if(!drone){
                return;
            }
            // console.log("receive drone position:", droneId, lng, lat);
            drone.location={
                lng:lng,
                lat:lat
            };
            // console.log(availableDrones);
            if(status=="IDLE")
                readyDrone.set(droneId, null);
                if(busyDrone.get(droneId))
                    busyDrone.delete(droneId)
            else if(status=="BUSY"){
                busyDrone.set(droneId, null);
                if(readyDrone.get(droneId))
                    readyDrone.delete(droneId);
            }
        });

    });
}

exports.droneSocketRegistration=()=>{
    const IO=getIO();
    IO.on("connection",(socket)=>{
        socket.on("drone:registerSocket", async (droneId)=>{
            console.log("drone socket registration:", droneId, socket.id);
            availableDrones.set(droneId,{
                socketId:socket.id
            });
            socketToDrone.set(socket.id, droneId);

            let drone=await Drone.findOne({
                droneId:droneId
            });
            if(drone.status=="IDLE")
                readyDrone.set(droneId, null);
                if(busyDrone.get(droneId))
                    busyDrone.delete(droneId)
            else if(drone.status=="BUSY"){
                busyDrone.set(droneId, null);
                if(readyDrone.get(droneId))
                    readyDrone.delete(droneId);
            }

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

exports.registerTrackDelivery=()=>{
    const IO=getIO();
    IO.on("connection",(socket)=>{
        socket.on("track-delivery",(orderId)=>{
            socket.join(orderId);
        }) 
    })
}