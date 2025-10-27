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
let time=0;

exports.trackDeliveryPartnerLocation=()=>{
    const io=getIO();
    io.on("connection", (socket)=>{
        socket.on("deliveryPartner:updateLocation", async ({jwt, location, socketId})=>{
            try {
                // console.log("data",data1);
                // console.log("updateLocation()");
                // console.log("time", time++);
                
                const {status, data}=await verifyJWT(jwt);
                if(status=="error")
                    return;
                let DeliveryPartnerSocketInfo=deliveryPartnerMap.get(data.accountId);
                if(DeliveryPartnerSocketInfo)
                {
                    DeliveryPartnerSocketInfo["location"]=location;
                    DeliveryPartnerSocketInfo["socketId"]=socketId;
                    // console.log("deliveryPartnerMap", deliveryPartnerMap.get(data.accountId));
                }
            } catch (error) {
                console.log("updateLocation", error);
                
            }
        })
    })
}