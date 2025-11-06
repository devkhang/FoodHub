import {
  SIGNUP_SUCCESS,
  LOADING_UI,
  SET_ERRORS,
  SERVER_ERROR,
  CLEAR_ERRORS,
  LOADING_USER,
  SET_USER,
  SET_ERROR,
  SET_UNAUTHENTICATED,
  SET_ERRORS_SIGNUP_SELLER,
  SET_DELIVERY_PortraitPhotoUrl,
  SET_DELIVERY_LicenseFrontPhotoUrl,
  SET_DELIVERY_LicenseBackPhotoUrl,
  SET_ERRORS_SIGNUP_DELIVERY
} from "../types";
import { useSelector } from "react-redux";
import axios from "../../util/axios";
import axiosNewInstance from "axios";
import {registerDeliveryPartnerSocket, 
        updateDeliveryPartnerLocation,
        JobNotification} from "../../socket/deliveryHandler";


import {initSocket, getSocket} from "../../socket/socket";

export const signupUser = (newUserData, history) => (dispatch) => {
  dispatch({ type: LOADING_UI });
  axios
    .post("/auth/signup-user", newUserData)
    .then((res) => {
      dispatch({
        type: SIGNUP_SUCCESS,
      });
      dispatch({ type: CLEAR_ERRORS });
      history.push("/login");
    })
    .catch((err) => {
      console.log(err.response.data);
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

export const loginAction = (userData, history) => (dispatch) => {
  dispatch({ type: LOADING_UI });
  axios
    .post("/auth/login", userData)
    .then((res) => {
      const jwt = `Bearer ${res.data.token}`;
      localStorage.setItem("jwt", jwt);
      axios.defaults.headers.common["Authorization"] = jwt;
      axios
      .get("/user")
      .then((res) => {
        console.log("user", res.data.result);
        if(res.data.result.account.role == 'ROLE_DELIVERY'){

          //configure socket for delivery partner
          console.log("loginAction()");
          
          const socket=initSocket(process.env.REACT_APP_SERVER_URL);
          socket.on("connect", ()=>{
            console.log("configure socket for delivery partner");
            registerDeliveryPartnerSocket();
            updateDeliveryPartnerLocation();
            JobNotification();
          });
        } 
      })

      dispatch(getUserData());
      dispatch({ type: CLEAR_ERRORS });
      history.push("/");
      // console.log("Authenticated, check localStorage", jwt);
    })
    .catch((err) => {
      if (err.response) {
        dispatch({
          type: SET_ERROR,
          payload: err.response.data,
        });
      } else {
        dispatch({
          type: SERVER_ERROR,
        });
      }
    });
};

export const getUserData = () => (dispatch) => {
  dispatch({ type: LOADING_USER });
  axios
    .get("/user")
    .then((res) => {
      console.log("user", res.data.result);
      dispatch({
        type: SET_USER,
        payload: res.data.result,
      });
      if(res.data.result.account.role == 'ROLE_DELIVERY'){
        dispatch({
          type: SET_DELIVERY_PortraitPhotoUrl,
          payload: res.data.result.portraitPhotoUrl
        })
        dispatch({
          type: SET_DELIVERY_LicenseFrontPhotoUrl,
          payload: res.data.result.licenseFrontPhotoUrl
        })
        dispatch({
          type: SET_DELIVERY_LicenseBackPhotoUrl,
          payload: res.data.result.licenseBackPhotoUrl
        })
      } 
    })
    .catch((err) => console.log(err));
};

export const signupSeller = (newSellerData, history) => (dispatch) => {
  const location = `+${newSellerData.get("aptName")},+${newSellerData.get(
    "locality"
  )},+${newSellerData.get("street")},+${newSellerData.get("zip")}`;
  axiosNewInstance
    .get("https://rsapi.goong.io/v2/geocode", {
      params: {
        address: location,
        api_key: process.env.REACT_APP_GOONG_API_KEY,
      },
    })
    .then((result) => {
      if (
        Array.isArray(result.data.results) &&
        result.data.results.length > 0
      ) {
        const formattedAddress = result.data.results[0].formatted_address;
        const lat = result.data.results[0].geometry.location.lat;
        const lng = result.data.results[0].geometry.location.lng;
        newSellerData.append("lat", lat);
        newSellerData.append("lng", lng);
        newSellerData.append("formattedAddress", formattedAddress);
      }

      dispatch(signupSellerFinal(newSellerData, history));
    })
    .catch((err) => {
      console.log(err);
    });
};

export const signupSellerFinal = (newSellerData, history) => (dispatch) => {
  dispatch({ type: LOADING_UI });
  axios
    .post("/auth/signup-seller", newSellerData)
    .then(res => {
    alert(res.data.message);
    window.location.href = res.data.onboardingUrl;
    })
    .then((res) => {
      dispatch({
        type: SIGNUP_SUCCESS,
      });
      dispatch({ type: CLEAR_ERRORS });
    })
    .catch((err) => {
      if (err.response) {
        dispatch({
          type: SET_ERRORS_SIGNUP_SELLER,
          payload: err.response.data,
        });
      } else {
        dispatch({
          type: SERVER_ERROR,
        });
      }
    });
};

export const signupDelivery = (newDeliveryData, history) => (dispatch) => {
  dispatch({ type: LOADING_UI });
  axios
    .post("/auth/signup-delivery-partner", newDeliveryData) // Sửa endpoint API cho Delivery
    .then((res) => {
      dispatch({
        type: SIGNUP_SUCCESS,
      });
      dispatch({ type: CLEAR_ERRORS });
      history.push("/login"); // Chuyển hướng đến trang đăng nhập sau khi đăng ký thành công
    })
    .catch((err) => {
      if (err.response) {
        // Sử dụng SET_ERRORS_SIGNUP_SELLER hoặc tạo một type mới nếu cần phân biệt rõ ràng
        dispatch({
          type: SET_ERRORS_SIGNUP_DELIVERY, 
          payload: err.response.data,
        });
      } else {
        dispatch({
          type: SERVER_ERROR,
        });
      }
    });
};

export const logoutAction = (history) => (dispatch) => {
  localStorage.removeItem("jwt");
  delete axios.defaults.headers.common["Authorization"];
  dispatch({ type: SET_UNAUTHENTICATED });
  if (history) history.push("/login");
};
