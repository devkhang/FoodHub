import {
  SET_RESTAURANTS,
  LOADING_DATA,
  SET_RESTAURANT,
  LOADING_UI,
  SET_ERROR_ITEM,
  SERVER_ERROR,
  CLEAR_ERRORS,
  ADD_ITEM,
  DELETE_ITEM,
  EDIT_ITEM,
  ADD_CART_SUCCESS,
  ADD_CART_FAIL,
  SET_CART,
  DELETE_ITEM_CART,
  SET_ERRORS,
  SET_ORDERS,
  EDIT_STATUS,
  STOP_LOADING_DATA
} from "../types";
import axios from "../../util/axios";
import axiosNewInstance from "axios";
import { getUserData } from "./authActions";
import { updatePage } from "./paginationActions";

export const fetchRestaurants = () => (dispatch) => {
  dispatch({ type: LOADING_DATA });
  axios
    .get("/restaurants")
    .then((res) => {
      dispatch({
        type: SET_RESTAURANTS,
        payload: res.data,
      });
    })
    .catch((err) => {
      console.log(err);
      dispatch({
        type: SET_RESTAURANTS,
        payload: [],
      });
    });
};

//get restaurant close to (lat, lng)
//then update the redux restaurants state
export const fetchRestaurantsByAddress = (lat, lng) => (dispatch) => {
  dispatch({ type: LOADING_DATA });
  axios
    .get(`/restaurants-location/${lat}/${lng}`)
    .then((res) => {
      dispatch({
        type: SET_RESTAURANTS,
        payload: res.data,
      });
    })
    .catch((err) => {
      console.log(err);
      dispatch({
        type: SET_RESTAURANTS,
        payload: [],
      });
    });
};

export const fetchRestaurantsByAddressPagination = (lat, lng, page, limit, first=false, last=false) => (dispatch) => {
  //[not done: refactor this code, is this really need ot be redux action]
  dispatch({ type: LOADING_DATA });
  let url=`/restaurants-location/${lat}/${lng}?page=${page}&limit=${limit}&first=${first?first:""}&last=${last?last:""}`;
  axios
    .get(url)
    .then((res) => {
      if(res.data.data && res.data.data.status==="fail")
        return;
      if(first)
        dispatch(updatePage(1))
      else if(last)
        dispatch(updatePage(res.data.totalPage))
      else
        dispatch(updatePage(page));
      dispatch({
        type: SET_RESTAURANTS,
        payload: res.data,
      });
    })
    .catch((err) => {
      // console.log(err);
      // dispatch({
      //   type: SET_RESTAURANTS,
      //   payload: ,
      // });
      dispatch({type:STOP_LOADING_DATA})
    });
};

export const fetchRestaurant = (restId) => (dispatch) => {
  dispatch({ type: LOADING_DATA });
  axios
    .get(`/restaurant/${restId}`)
    .then((res) => {
      dispatch({
        type: SET_RESTAURANT,
        payload: res.data,
      });
    })
    .catch((err) => {
      console.log(err);
      dispatch({
        type: SET_RESTAURANT,
        payload: {},
      });
    });
};

export const addItem = (itemData) => (dispatch) => {
  dispatch({ type: LOADING_UI });
  axios
    .post(`/seller/create-item`, itemData)
    .then((res) => {
      dispatch({
        type: ADD_ITEM,
        payload: res.data.item,
      });
      dispatch({ type: CLEAR_ERRORS });
    })
    .catch((err) => {
      console.log(err.response.data);
      if (err.response) {
        dispatch({
          type: SET_ERROR_ITEM,
          payload: err.response.data,
        });
      } else {
        dispatch({
          type: SERVER_ERROR,
        });
      }
    });
};

export const deleteItem = (itemId) => (dispatch) => {
  axios
    .delete(`/seller/delete-item/${itemId}`)
    .then((res) => {
      dispatch({
        type: DELETE_ITEM,
        payload: itemId,
      });
    })
    .catch((err) => {
      console.log(err.response);
    });
};

export const editItem = (itemData, itemId) => (dispatch) => {
  axios
    .put(`/seller/edit-item/${itemId}`, itemData)
    .then((res) => {
      dispatch({
        type: EDIT_ITEM,
        payload: res.data.item,
      });
    })
    .catch((err) => {
      console.log(err.response.data);
      if (err.response) {
        dispatch({
          type: SET_ERROR_ITEM,
          payload: err.response.data,
        });
      } else {
        dispatch({
          type: SERVER_ERROR,
        });
      }
    });
};

export const addToCart = (itemData) => (dispatch) => {
  axios
    .post("/cart", itemData)
    .then((res) => {
      dispatch({
        type: ADD_CART_SUCCESS,
        payload: itemData.itemId,
      });
      dispatch(getCart());
    })
    .catch((err) => {
      console.log(err.response);
      dispatch({
        type: ADD_CART_FAIL,
      });
    });
};

export const getCart = () => (dispatch) => {
  axios
    .get("/cart")
    .then((res) => {
      dispatch({
        type: SET_CART,
        payload: res.data,
      });
    })
    .catch((err) => {
      console.log(err.response);
      dispatch({
        type: SET_CART,
        payload: [],
      });
    });
};

export const deleteCartItem = (itemData) => (dispatch) => {
  axios
    .post("/delete-cart-item", itemData)
    .then((res) => {
      dispatch({
        type: DELETE_ITEM_CART,
      });
      dispatch(getCart());
    })
    .catch((err) => {
      console.log(err.response);
    });
};

export const removeCartItem = (itemID) => (dispatch) => {
  axios
    .post(`/remove-cart-item/${itemID}`)
    .then((res) => {
      console.log(res.data);
      dispatch(getCart());
    })
    .catch((err) => {
      console.log(err.response);
    });
};

export const fetchAddress = (userData, history) => (dispatch) => {
  console.log("fetchAddress at dataAction.js");
  console.log("goong gecode endpoint", process.env.REACT_APP_GOONG_GEOCODE);

  const location = `+${userData.aptName},+${userData.locality},+${userData.street},+${userData.zip}`;
  axiosNewInstance
    .get(process.env.REACT_APP_GOONG_GEOCODE, {
      params: {
        address: location,
        api_key: process.env.REACT_APP_GOONG_API_KEY,
      },
    })
    .then((result) => {
      const formattedAddress = result.data.results[0].formatted_address;
      console.log(formattedAddress);
      const lat = result.data.results[0].geometry.location.lat;
      const lng = result.data.results[0].geometry.location.lng;
      userData.lat = lat;
      userData.lng = lng;
      userData.formattedAddress = formattedAddress;
      dispatch(addAddress(userData, history));
    })
    .catch((err) => {
      console.log("fail");
      console.log(err);
    });
};

export const addAddress = (userData, history) => (dispatch) => {
  console.log(userData.formattedAddress);
  axios
    .post("/user/address", userData)
    .then((res) => {
      // console.log(res.data);
      dispatch(getUserData());
      dispatch({ type: CLEAR_ERRORS });
      dispatch(placeOrder(history));
    })
    .catch((err) => {
      console.log(err.response);
      if (err.response) {
        dispatch({
          type: SET_ERRORS,
          payload: err.response.data,
        });
      } else {
        dispatch({
          type: SERVER_ERROR,
        });
      }
    });
};

export const placeOrder = (history) => (dispatch) => {
  axios
    .post("/order")
    .then((res) => {
      history.push("/orders");
      dispatch(getOrders());
    })
    .catch((err) => {
      console.log(err.response);
    });
};

export const getOrders = () => (dispatch) => {
  dispatch({ type: LOADING_DATA });
  axios
    .get("/orders")
    .then((res) => {
      dispatch({
        type: SET_ORDERS,
        payload: res.data.orders,
      });
    })
    .catch((err) => {
      console.log(err.response);
    });
};

export const changeOrderStatus = (orderId, body) => (dispatch) => {
  axios
    .post(`/order-status/${orderId}`, body)
    .then((res) => {
      dispatch({
        type: EDIT_STATUS,
        payload: res.data.updatedOrder,
      });
    })
    .catch((err) => {
      console.log(err.response);
    });
};

export const socketStatusUpdate = (order) => (dispatch) => {
  dispatch({
    type: EDIT_STATUS,
    payload: order,
  });
};
