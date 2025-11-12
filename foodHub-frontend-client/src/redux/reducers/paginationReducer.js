
const initialState=
{
    page:1
}


export default function paginationReducer(state=initialState, action){
    console.log("deliveryDataReducer() + action.type", action.type);
    
    switch(action.type){
        case "UPDATE_PAGE":
            return {
                ...state,
                page:action.payload.page
            };
            break;
        default:
            return state;
    }

}