const socket = require("../../util/socket");
const {init, getIO}=require("../../util/socket");
const deliveryPartnerMap=require("../sources/DeliveryPartnerSource");
const jwt=require("jsonwebtoken");
const {verifyJWT}=require("../../util/jwtUtil");


exports.registerDeliveryPartner=()=>{

    const IO=getIO();
    IO.on("connection", (socket)=>{
            socket.on("deliveryPartner:socketRegistration", async (jwtToken)=>{
                try{
                    console.log("socketRegistration()");
                    
                    let {status, data}=await verifyJWT(jwtToken);
                    if(status=="error")
                        return;
                    let decodedJwtToken=data;
                    deliveryPartnerMap.set(decodedJwtToken.accountId, {
                        "socketId":socket.id
                    });
                    console.log("deliveryPartnerMap", deliveryPartnerMap.get(decodedJwtToken.accountId));
                }
                catch(err){
                    console.log("registerDeliveryPartner", err);
                }
            })
    })
}

exports.trackDeliveryPartnerLocation=()=>{
    const io=getIO();
    io.on("connection", (socket)=>{
        socket.on("deliveryPartner:updateLocation", async ({jwt, location})=>{
            try {
                console.log("updateLocation()");
                
                const {status, data}=await verifyJWT(jwt);
                if(stats=="error")
                    return;
                let info=deliveryPartnerMap.get(data.accountId);
                if(info)
                {
                    info["location"]=location;
                    console.log("deliveryPartnerMap", deliveryPartnerMap(info.accountId));
                }
            } catch (error) {
                console.log("updateLocation", error);
                
            }
        })
    })
}