
const initialState=
{
    deliveryCharge:null,
    totalItemMoney:null,
    sellerAddress:{
        formattedAddress:null,
        pos:{
            lat:null,
            lng:null
        }
    },
    customerAddress:{
        formattedAddress:null,
        pos:{
            lat:null,
            lng:null
        }
    },
    deliveryCharge:null
}


export default function deliveryDataReducer(state=initialState, action){
    console.log("deliveryDataReducer() + action.type", action.type);
    
    switch(action.type){
        case "setDeliveryJobNotification":
            console.log("choose setDeliveryJobNotification+action.payload", action.payload);
            return {
                ...state,
                ...(action.payload)
            };
            break;
        case "SET_DELIVERY_CHARGE":
            return{
                ...state,
                deliveryCharge:action.payload
            }
        case "removeDeliveryJobNotification":
            return initialState
        default:
            return state;
    }

}