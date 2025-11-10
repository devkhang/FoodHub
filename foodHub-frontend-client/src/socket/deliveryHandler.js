import axios from "axios";
import {initSocket, getSocket} from "./socket"
import {useHistory} from "react-router-dom";
import {historyReactRouterObj} from "../components/ReactRouterHistoryProvider";
import store from "../redux/store";
import {setDeliveryJobNotification} from "../redux/actions/deliveryActions";

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
    socket.on("delivery:job_notification", async ({orderId, timeout})=>{
        let deliveryDetail=await axios.post(`${process.env.REACT_APP_SERVER_URL}/delivery/getJobDeliveryNotificationDetail`,{
            jwtToken:localStorage.getItem("jwt").split(" ")[1],
            orderId:orderId
        });
        if(deliveryDetail.data.status!=="ok")
            return;
        deliveryDetail=deliveryDetail.data.data;

        store.dispatch(setDeliveryJobNotification(deliveryDetail));
        historyReactRouterObj.push("/deliveryJobNotification")

        //[not done: reuse these logic]
        // const jobNotificationAns=confirm(`Delivery job for order ${orderId}`);
        // if(jobNotificationAns){
        //     // console.log("jwt", localStorage.getItem("jwt").);
            
        //     axios.post(process.env.REACT_APP_SERVER_URL+"/delivery/accept-delivery-job",{
        //         jwtToken:localStorage.getItem("jwt").split(' ')[1],
        //         orderId:orderId
        //     })
        //     .then((response)=>{
        //         const history=useHistory();
        //         console.log("job notification: response", response);
        //         if(response.data.status=="ok"){
        //             history.push("/deliveryJobNotification");
        //         }
        //     })
        //     .catch( (error)=>{
        //         console.log("Fail:", error);  
        //     })
        // }
        // else{

        // }
    })
}

export const registerTrackDelivery=(orderId)=>{
    const socket=getSocket();
    socket.emit("register-track-delivery", orderId)
}

export const unRegisterTrackDelivery=(orderId)=>{
    const socket=getSocket();
    socket.emit("unregister-track-delivery",orderId);
}

export const trackDelivery=(map, positionSource, routeSource)=>{
    const socket=getSocket();
    socket.on("drone-delivery-progress",(geoJsonPosition, geojsonRoute)=>{
        //[not done: not implemented]
        map.getSource(positionSource).setData({
            geoJsonPosition
        });
        map.getSource(routeSource).setData({
            geojsonRoute
        });
    })
}

export const unTrackDelivery=()=>{
    socket.removeAllListeners("drone-delivery-progress");
}