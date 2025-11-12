/*
input:
-deliveryJobDetail:{
    deliveryCharge:,
    totalItemMoney:,
    sellerAddress:{
        formattedAddress:,
        pos:{
            lng:,
            lat
        }
    },
    customerAddress:{
        formattedAddress:,
        pos:{
            lng:,
            lat
        }
    },
    orderId:
}
*/
export function setDeliveryJobNotification(deliveryJobDetail){
    console.log("setDeliveryJobNotification()");
    
    return{
        type:"setDeliveryJobNotification",
        payload:{
            ...deliveryJobDetail
        }
    }
}
export function removeDeliveryJobNotification(){
    return{
        type:"removeDeliveryJobNotification"
    }
}