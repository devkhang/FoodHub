import React, { useEffect,useLayoutEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import openSocket from "socket.io-client";

import { getOrders, socketStatusUpdate, verifySessionAndPlaceOrder} from "../redux/actions/dataActions";
import OrderCard from "../components/OrderCard";
import { useHistory} from 'react-router-dom';
//material-ui
import makeStyles from "@material-ui/core/styles/makeStyles";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";

const useStyles = makeStyles((theme) => ({
  ...theme.spreadThis,
  para: {
    fontSize: "x-large",
    marginLeft: "32%",
  },
  title: {
    margin: "10px 0px 10px 130px",
    display: "inline-block",
    marginRight: "40%",
  },
}));

const Orders = (props) => {
  const dispatch = useDispatch();
  const history = useHistory();
  const { orders} = useSelector((state) => state.data);
  const {
    account: { role },
    _id,
  } = useSelector((state) => state.auth);
  const classes = useStyles();
  useLayoutEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    console.log('sessionId :',sessionId); // Lấy từ URL ?session_id=xxx
    if (sessionId) {
      dispatch(verifySessionAndPlaceOrder(sessionId))
      .then(() => {
          history.push('/orders'); // ← REDIRECT Ở ĐÂY
        })
        .catch(() => {
          history.push('/cart');
        }); // ← GỌI Ở ĐÂY: Verify + placeOrder nếu paid
      // Clear URL để sạch (không hiện param nữa)
      window.history.replaceState({}, document.title, '/orders');
    } else {
      dispatch(getOrders()); // Bình thường, nếu không có session_id
    }
  }, [dispatch]); // Dependency: dispatch (eslint ok)

  useEffect(() => {
    dispatch(getOrders());
    const socket = openSocket(process.env.REACT_APP_SERVER_URL);
    socket.emit("add-user", { userId: _id });
    socket.on("orders", (data) => {
      if (data.action === "update") {
        dispatch(socketStatusUpdate(data.order));
      }
      if (data.action === "create") {
        dispatch(getOrders());
        dispatch(getOrders());
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Typography variant="h5" className={classes.title}>
        Order History
      </Typography>
      <Grid item container direction="row">
        <Grid item xs={12} sm={1} />
        <Grid item xs={12} sm={10}>
          <Grid container spacing={2}>
            {orders ? (
              orders.length > 0 ? (
                orders.map((order) => (
                  <Grid item xs={12} sm={4} key={order._id}>
                    <OrderCard order={order} role={role} />
                  </Grid>
                ))
              ) : (
                <p className={classes.para}>No Orders present.</p>
              )
            ) : null}
          </Grid>
        </Grid>
        <Grid item xs={12} sm={1} />
      </Grid>
    </>
  );
};

export default Orders;
