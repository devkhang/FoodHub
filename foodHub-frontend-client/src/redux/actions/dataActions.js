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
} from "../types";
import axios from "../../util/axios";
import axiosNewInstance from "axios";
import { getUserData } from "./authActions";

export const clearCart = () => ({
    type: SET_CART,
    payload: {
        cart: [],        // Mảng rỗng
        totalPrice: 0    // Tổng tiền bằng 0
    }
});

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
  console.log(userData);
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

// dataActions.js – createCheckoutSession
export const createCheckoutSession = (history) => (dispatch, getState) => {
  dispatch({ type: LOADING_UI });

  const { cart = [], price = 0 } = getState().data;
  const deliveryCharge = price !== 0 ? 30000 : 0;
  console.log("cart :",cart);

  const orderData = {
    items: cart.map(c => ({
      itemId: c.itemId._id.toString(),   // chỉ ID (string)
      title:  c.itemId.title,            // tiêu đề ngắn
      price:  c.itemId.price*100,
      quantity: c.quantity,
    })),
    total: price + deliveryCharge,
  };

  axios
    .post("/order/create-checkout-session", orderData)
    .then(res => {
      dispatch({ type: CLEAR_ERRORS });
      window.location.href = res.data.sessionUrl;   // redirect
    })
    .catch(err => {
      console.error(err);
      dispatch({ type: SET_ERRORS, payload: [{ msg: "Lỗi tạo thanh toán!" }] });
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
      dispatch(createCheckoutSession(history));
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

export const verifySessionAndPlaceOrder = (sessionId) => (dispatch) => {
  dispatch({ type: LOADING_DATA });

  return axios.post("/verify-session", { session_id: sessionId })
    .then((res) => {
      if (res.data.paid) {
        return dispatch(placeOrder(sessionId)); // ← Chỉ truyền sessionId
      } else {
        alert("Thanh toán chưa hoàn tất!");
        return Promise.reject();
      }
    })
    .catch((err) => {
      const msg = err.response?.data?.message || err.message || "Lỗi verify session";
      console.error("[LỖI] verifySession:", msg); // ← CHỈ 1 DÒNG
      alert(msg);
      throw err;
    });
};

export const placeOrder = (sessionId) => (dispatch) => {
  return axios.post("/order", { session_id: sessionId })
    .then(() => {
      dispatch(getOrders());
      dispatch(clearCart());
    })
    .catch(err => {
      console.error("Lỗi placeOrder:", err);
      throw err;
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
