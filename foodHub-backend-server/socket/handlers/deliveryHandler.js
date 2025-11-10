import {getIO} from "../../util/socket";
import {droneOrderAssignment, socketToDrone} from "../sources/droneSource";

export const registerTrackDelivery=()=>{
    const io=getIO();
    io.on("connection",(socket)=>{
        socket.on("register-track-delivery", (orderId)=>{
            socket.join(orderId);
        })
    })
}

export const unRegisterTrackDelivery=(orderId)=>{
    const io=getIO();
    io.on("connection",(socket)=>{
        socket.on("unregister-track-delivery", (orderId)=>{
            socket.leave(orderId);
        })
    })
}

export const trackDelivery=()=>{
    const io=getIO();
    io.on("connection",(socket)=>{
        socket.on("update-delivery-progress", ({orderId, geoJsonPosition, geojsonRoute})=>{
            if(socketToDrone.has(socket.id)){
                let droneId=socketToDrone.get(socket.id).droneId;
                if(droneOrderAssignment.get(orderId).droneId===droneId){
                    io.to(orderId).emit("drone-delivery-progress",{
                        orderId:orderId,
                        geoJsonPosition: geoJsonPosition, 
                        geojsonRoute:geojsonRoute
                    });
                }

            }  
            
        })
    })
}

