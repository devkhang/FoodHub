import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

//redux
import { Provider } from "react-redux";
import store from "./redux/store";

import { SET_AUTHENTICATED } from "./redux/types";
import { logoutAction, getUserData } from "./redux/actions/authActions";

//axios
import axios from "./util/axios";

//jwt-decode
import jwtDecode from "jwt-decode";

//material-ui
import { ThemeProvider as MuiThemeProvider } from "@material-ui/core/styles";
import createMuiTheme from "@material-ui/core/styles/createMuiTheme";

//theme
import themeFile from "./util/theme";

//components
import AppBar from "./components/AppBar";
import Footer from "./components/Footer";

//util
import ScrollToTop from "./util/scrollToTop";

//restrict routes
import { AuthRoute, SellerRoute, UserRoute,DeliveryRoute } from "./util/route";

//pages
import home from "./pages/home";
import error404 from "./pages/404";
import signup from "./pages/sign-up";
import login from "./pages/login";
import addRestaurant from "./pages/addRestaurant";
import delivery from "./pages/delivery"
import restaurant from "./pages/restaurant";
import sellerDash from "./pages/sellerDashboard";
import cart from "./pages/cart";
import orders from "./pages/orders";
import profile from "./pages/profile";
import Invoice from "./pages/Invoice";
import OnboardingSuccess from "./pages/OnboardingSuccess";
import OnboardingRefresh from "./pages/OnboardingRefresh";
import { useLayoutEffect } from "react"
//socket
import {initSocket, getSocket} from "./socket/socket"
const io=initSocket(process.env.REACT_APP_SERVER_URL);

const theme = createMuiTheme(themeFile);
const token = localStorage.jwt;

if (token) {
  const decodedToken = jwtDecode(token);
  // console.log(decodedToken);
  if (decodedToken.exp * 1000 < Date.now()) {
    store.dispatch(logoutAction());
    window.location.href = "/login";
  } else {
    store.dispatch({ type: SET_AUTHENTICATED });
    axios.defaults.headers.common["Authorization"] = token;
    store.dispatch(getUserData());
  }
}

function App() {
  console.log("App");

  useLayoutEffect(() => {
    const token = localStorage.getItem("jwt");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          store.dispatch({ type: SET_AUTHENTICATED }); // ← DÙNG store.dispatch
          axios.defaults.headers.common["Authorization"] = token;
          store.dispatch(getUserData()); // ← DÙNG store.dispatch
        } else {
          store.dispatch(logoutAction());
          window.location.href = "/login";
        }
      } catch (err) {
        localStorage.removeItem("jwt");
        window.location.href = "/login";
      }
    }
  }, []);
  return (
    <MuiThemeProvider theme={theme}>
      <Provider store={store}>
        <Router>
          <AppBar />
          <ScrollToTop />
          <Switch>
            <Route exact path="/" component={home} />
            <AuthRoute exact path="/login" component={login} />
            <AuthRoute exact path="/register" component={signup} />
            <AuthRoute exact path="/delivery" component={delivery} />
            <DeliveryRoute exact path="/delivery/profile" component={profile} />
            <DeliveryRoute exact path="/delivery/OrderDetail" component={Invoice} />
            <AuthRoute exact path="/addrestaurant" component={addRestaurant} />
            <UserRoute exact path="/order/:restName" component={restaurant} />
            <SellerRoute
              exact
              path="/seller/dashboard"
              component={sellerDash}
            />
            <Route path="/onboarding/success" component={OnboardingSuccess} />
            <Route path="/onboarding/refresh" component={OnboardingRefresh} />
            <UserRoute exact path="/cart" component={cart} />
            <UserRoute path="/orders" component={orders} />
            <SellerRoute exact path="/seller/orders" component={orders} />
            <Route component={error404} />
          </Switch>
          <Footer />
        </Router>
      </Provider>
    </MuiThemeProvider>
  );
}

export default App;
