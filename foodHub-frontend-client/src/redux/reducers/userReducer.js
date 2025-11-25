import {
  SET_USER,
  LOADING_USER,
  SET_UNAUTHENTICATED,
  SET_AUTHENTICATED,
  ADD_ITEM,
  DELETE_ITEM,
  EDIT_ITEM,
  SET_DELIVERY_PortraitPhotoUrl,
  SET_DELIVERY_LicenseFrontPhotoUrl,
  SET_DELIVERY_LicenseBackPhotoUrl
} from "../types";

const initialState = {
  authenticated: false,
  phone: "",
  loading: false,
  account: {},
  name: "",
  address: {},
  imageUrl: [],
  payment: [],
  items: [],
  tags: "",
  cart: {},
  _id: "",
  firstName: "",
  lastName: "",
  PortraitPhotoUrl:"",
  LicenseFrontPhotoUrl:"",
  LicenseBackPhotoUrl:"",
  email:"",
  CCCD:""
};

export default function userReducer(state = initialState, action) {
  switch (action.type) {
    case SET_USER:
      return {
        authenticated: true,
        ...action.payload,
        loading: false,
      };
    case SET_AUTHENTICATED:
      return {
        ...state,
        authenticated: true,
      };
    case SET_UNAUTHENTICATED:
      return initialState;
    case LOADING_USER:
      return {
        ...state,
        loading: true,
      };
    case ADD_ITEM:
      return {
        ...state,
        loading: false,
        items: [...state.items, action.payload],
      };
    case SET_DELIVERY_PortraitPhotoUrl:
      return {
        ...state,
        loading: false,
        PortraitPhotoUrl:action.payload
      }
    case SET_DELIVERY_LicenseFrontPhotoUrl:
      return {
        ...state,
        loading: false,
        LicenseFrontPhotoUrl:action.payload
      }
    case SET_DELIVERY_LicenseBackPhotoUrl:
      return {
        ...state,
        loading:false,
        LicenseBackPhotoUrl:action.payload
      }
    case DELETE_ITEM:
      return {
        ...state,
        items: state.items.filter((item) => item._id !== action.payload),
      };

    case EDIT_ITEM:
      return {
        ...state,
        items: state.items.map((item) =>
          item._id === action.payload._id ? { ...action.payload } : item
        ),
      };

    default:
      return state;
  }
}
