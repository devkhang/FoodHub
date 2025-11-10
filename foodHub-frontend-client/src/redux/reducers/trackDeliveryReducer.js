const initialState={
    orderId:null
}

export default function trackDeliveryReducer(state=initialState, action){
    switch (action.type) {
        case "SET_TRACK_DELIVERY":
            return {
                ...state,
                orderId:action.payload.orderId,
            }
            break;
    
        default:
            return state;
            break;
    }
}