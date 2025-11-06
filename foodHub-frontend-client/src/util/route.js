import React from "react";
import { useSelector } from "react-redux";
import { Route, Redirect } from "react-router-dom";

export const AuthRoute = ({ component: Component, ...rest }) => {
  const { authenticated } = useSelector((state) => state.auth);

  return (
    <Route
      {...rest}
      render={(props) =>
        authenticated === true ? <Redirect to="/" /> : <Component {...props} />
      }
    />
  );
};

export const UserRoute = ({ component: Component, ...rest }) => {
  const { authenticated, account } = useSelector((state) => state.auth);

  return (
    <Route
      {...rest}
      render={(props) => {
        // 1. Chưa đăng nhập → về login
        if (!authenticated) {
          return <Redirect to="/login" />;
        }

        // 2. Đã đăng nhập nhưng KHÔNG PHẢI USER → về home
        if (account?.role !== "ROLE_USER") {
          return <Redirect to="/" />;
        }

        // 3. Đúng USER → cho vào
        return <Component {...props} />;
      }}
    />
  );
};

export const SellerRoute = ({ component: Component, ...rest }) => {
  const { authenticated, account } = useSelector((state) => state.auth);

  return (
    <Route
      {...rest}
      render={(props) => {
        // 1. Chưa đăng nhập → về login
        if (!authenticated) {
          return <Redirect to="/login" />;
        }

        // 2. Đã đăng nhập nhưng KHÔNG PHẢI SELLER → về home
        if (account.role !== "ROLE_SELLER") {
          return <Redirect to="/" />;
        }

        // 3. Đúng SELLER → cho vào
        return <Component {...props} />;
      }}
    />
  );
};

export const DeliveryRoute = ({ component: Component, ...rest }) => {
  const {
    authenticated,
    account: { role },
  } = useSelector((state) => state.auth);

  return (
    <Route
      {...rest}
      render={(props) =>
        !authenticated ? (
          <Redirect to="/login" /> // Chuyển hướng đến /login nếu chưa xác thực
        ) : role === "ROLE_DELIVERY" ? (
          <Component {...props} /> // Render Component (profile) nếu là ROLE_DELIVERY
        ) : (
          <Redirect to="/" /> // Chuyển hướng về / nếu không phải ROLE_DELIVERY
        )
      }
    />
  );
};