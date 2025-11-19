const Order = require("../../modules/order/models/order");
const {getIO}=require("../../util/socket");
const { accountIdToSocket } = require("../sources/clientSource");
const {droneOrderAssignment, socketToDrone}=require("../sources/droneSource");

exports.registerTrackDelivery=()=>{
    const io=getIO();
    io.on("connection",(socket)=>{
        socket.on("register-track-delivery", (orderId)=>{
            socket.join(orderId);
        })
    })
}

exports.unRegisterTrackDelivery=()=>{
    const io=getIO();
    io.on("connection",(socket)=>{
        socket.on("unregister-track-delivery", (orderId)=>{
            socket.leave(orderId);
        })
    })
}

exports.trackDelivery=()=>{
    const io=getIO();
    io.on("connection",(socket)=>{
        socket.on("update-delivery-progress", ({orderId, geoJsonPosition, geojsonRoute})=>{
            if(socketToDrone.has(socket.id)){
                let droneId=socketToDrone.get(socket.id);
                if(droneOrderAssignment.get(orderId) && droneOrderAssignment.get(orderId).droneId===droneId){
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

exports.deliveryArrive=()=>{
    const io=getIO();
    io.on("connection",(socket)=>{
        socket.on("delivery:arrive",async ({orderId})=>{
            let order=await Order.findById(orderId);
            let sellerId=order.seller.sellerId.toString();
            let socketId=accountIdToSocket.get(sellerId);
            io.to(socketId).emit("delivery:arrive",{
                orderId:orderId
            })
        })
    })    
}

