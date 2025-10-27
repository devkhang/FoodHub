import axios from "axios";
import {initSocket, getSocket} from "./socket"

export function registerDeliveryPartnerSocket(){
    const socket=getSocket();
    console.log("registerDeliveryPartnerSocket()", socket.id);
    let jwt=localStorage.getItem("jwt").split(" ")[1];
    console.log("JWt",jwt);
    
    // socket.emit("hello", "good jobs")
    socket.emit("deliveryPartner:socketRegistration", jwt);
}

let updateLocationInterval;

export function updateDeliveryPartnerLocation(){
    console.log("updateDeliveryPartnerLocation()");
    
    const socket=getSocket();
    if(!navigator.geolocation){        
        alert("your browser doesn't support GeoLocation API, your real location will not be updated");
        return;
    }

    updateLocationInterval=setInterval(() => {
    navigator.geolocation.getCurrentPosition((pos)=>{
        if(!localStorage.getItem("jwt") || socket.disconnected){
            clearInterval(updateLocationInterval);
            socket.disconnect();
            return;
        }
        console.log("update delivery partner location");
        
        socket.emit("deliveryPartner:updateLocation", {
            jwt:localStorage.getItem("jwt").split(" ")[1],
            location:{
                lng:pos.coords.longitude,
                lat:pos.coords.latitude
            },
            socketId:socket.id
        });
        });
    }, 1500);
}

export function JobNotification(){
    const socket=getSocket();
    socket.on("delivery:job_notification", ({orderId, timeout})=>{
        //[not done] create redux store for delivery job
        const jobNotificationAns=confirm(`Delivery job for order ${orderId}`);
        if(jobNotificationAns){
            // console.log("jwt", localStorage.getItem("jwt").);
            
            axios.post(process.env.REACT_APP_SERVER_URL+"/delivery/accept-delivery-job",{
                jwtToken:localStorage.getItem("jwt").split(' ')[1],
                orderId:orderId
            })
            .then((response)=>{
                //[not done] switch to delivery business process
                console.log("job notification: response", response);
            })
            .catch( (error)=>{
                console.log("Fail:", error);  
            })
        }
        else{

        }
    })
}