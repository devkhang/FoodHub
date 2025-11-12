import { createStore, combineReducers, applyMiddleware, compose } from "redux";
import thunk from "redux-thunk";

//reducers
import userReducer from "./reducers/userReducer";
import dataReducer from "./reducers/dataReducer";
import uiReducer from "./reducers/uiReducer";
import deliveryDataReducer from "./reducers/deliveryReducer";
import trackDeliveryReducer from "./reducers/trackDeliveryReducer";
import paginationReducer from "./reducers/paginationReducer";

const initialState = {};

const middleware = [thunk];

const reducers = combineReducers({
  auth: userReducer,
  data: dataReducer,
  UI: uiReducer,
  deliveryData:deliveryDataReducer,
  trackDelivery: trackDeliveryReducer,
  pagination: paginationReducer
});

const composeEnhancers =
  typeof window === "object" && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({})
    : compose;

const enhancer = composeEnhancers(applyMiddleware(...middleware));
const store = createStore(reducers, initialState, enhancer);

export default store;
