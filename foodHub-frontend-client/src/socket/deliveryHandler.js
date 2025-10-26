import {initSocket, getSocket} from "./socket"

export function registerDeliveryPartnerSocket(){
    console.log("registerDeliveryPartnerSocket");
    const socket=getSocket();
    let jwt=localStorage.getItem("jwt").split(" ")[1];
    console.log("JWt",jwt);
    
    // socket.emit("hello", "good jobs")
    socket.emit("deliveryPartner:socketRegistration", jwt);
}

export function updateDeliveryPartnerLocation(){
    const socket=getSocket();
    if(!navigator.geolocation){        
        alert("your browser doesn't support GeoLocation API, your real location will not be updated");
        return;
    }

        setTimeout(() => {
        navigator.geolocation.getCurrentPosition((pos)=>{
            socket.emit("deliveryPartner:updateLocation", {
                jwt:localStorage.getItem("jwt").split(" ")[1],
                data:{
                    lng:pos.coords.longtitude,
                    lat:pos.coords.latitude
                }
            });
        });        
    }, 1500);
}
