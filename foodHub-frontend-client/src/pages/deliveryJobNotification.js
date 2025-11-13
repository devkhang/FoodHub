import { useDispatch, useSelector } from "react-redux"
import React from "react"
import { useEffect } from "react";
import axios from "axios";
import store from "../redux/store";
import {removeDeliveryJobNotification} from '../redux/actions/deliveryActions';
import {historyReactRouterObj} from "../components/ReactRouterHistoryProvider";

function onAcceptJob(event){
    //[not done]
}
async function onRefuseJob(orderId){
    let result=await axios.post(`${process.env.REACT_APP_SERVER_URL}/delivery/refuseDeliveryJob`,{
        jwtToken:localStorage.getItem("jwt").split(" ")[1],
        orderId:orderId
    });
    if(result.data.status=="ok"){
        console.log("refuse delivery job success");
        
        store.dispatch(removeDeliveryJobNotification());
        historyReactRouterObj.push("/");
    }
}

const DeliveryJobNotification=(props)=>{
    let deliveryCharge=useSelector(state=>state.deliveryData.deliveryCharge);
    let totalItemMoney=useSelector(state=>state.deliveryData.totalItemMoney);
    let sellerAddress=useSelector(state=>state.deliveryData.sellerAddress);
    let customerAddress=useSelector(state=>state.deliveryData.customerAddress);
    let orderId=useSelector(state=>state.deliveryData.orderId);
    
    useSelector(state=>console.log("delivery data state:",state.deliveryData));

    let currentPosition={
        lat:null, 
        lng:null
    };
    const dispatch=useDispatch();
    let sellerDistance={
        "distance": {
            "text": "7.59 km",
            "value": 7593
        },
        "duration": {
            "text": "22 phút",
            "value": 1313
        }
    };
    let customerDistance={
        "distance": {
            "text": "7.59 km",
            "value": 7593
        },
        "duration": {
            "text": "22 phút",
            "value": 1313
        }
    };
    

    useEffect(()=>{
        console.log("DeliveryJobNotification useEffect()");
        
        console.log("sellerAddress", sellerAddress);
        
        if(!navigator.geolocation){
            alert("Your browsers doesn't support GeoLocation API");
        }
        navigator.geolocation.getCurrentPosition(async (pos)=>{
            currentPosition={
                "lng":pos.coords.longitude,
                "lat":pos.coords.latitude
            }
            console.log("url", `${process.env.REACT_APP_GOONG_DISTANCEMATRIX}?origins=${currentPosition.lat},${currentPosition.lng}&destinations=${sellerAddress.pos.lat},${sellerAddress.pos.lng}&vehicle=car&api_key=${process.env.REACT_APP_GOONG_API_KEY}`);
            
            let distancesMatrix=await axios.get(`${process.env.REACT_APP_GOONG_DISTANCEMATRIX}?origins=${currentPosition.lat},${currentPosition.lng}&destinations=${sellerAddress.pos.lat},${sellerAddress.pos.lng}&vehicle=car&api_key=${process.env.REACT_APP_GOONG_API_KEY}`)
            distancesMatrix=distancesMatrix.data;
            console.log("distancesMatrix seller:", distancesMatrix);
            sellerDistance.distance=distancesMatrix.rows[0].elements[0].distance;
            sellerDistance.duration=distancesMatrix.rows[0].elements[0].duration;

            distancesMatrix=await axios.get(`${process.env.REACT_APP_GOONG_DISTANCEMATRIX}?origins=${sellerAddress.pos.lat},${sellerAddress.pos.lng}&destinations=${customerAddress.pos.lat},${customerAddress.pos.lng}&vehicle=car&api_key=${process.env.REACT_APP_GOONG_API_KEY}`)
            distancesMatrix=distancesMatrix.data;
            console.log("distancesMatrix", distancesMatrix);
            customerDistance.distance=distancesMatrix.rows[0].elements[0].distance;
            customerDistance.duration=distancesMatrix.rows[0].elements[0].duration;

        });
    },[])

            

    return (
        <div>
            <p>Delivery charge: {deliveryCharge}</p>
            <p>Total product price in order: {totalItemMoney}</p>
            <p>Seller address: {sellerAddress.formattedAddress}</p>
            <p>Distance to seller:{sellerDistance.distance.text}</p>
            <p>Customer address: {customerAddress.formattedAddress}</p>
            <p>Distance to customer: {customerDistance.distance.text}</p>
            <button onClick={()=>onRefuseJob(orderId)}>No</button>
            <button>Yes</button>
        </div>
        // <div>
        //     <h1>This is delivery job</h1>
        // </div>
    )

    // return(
    //     <div>
    //         <h1>This is delivery job notification</h1>
    //     </div>
    // )

}
export default DeliveryJobNotification;