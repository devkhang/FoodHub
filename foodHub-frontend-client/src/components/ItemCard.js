import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

//m-ui
import { makeStyles } from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import CardMedia from "@material-ui/core/CardMedia";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";

// Icons
import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";

//custom-hook
import useForm from "../hooks/forms";

import MyButton from "../util/MyButton";
import { clearAddCartFailReason, deleteItem, editItem } from "../redux/actions/dataActions";
import ItemDialog from "../components/ItemDialog";
import { addToCart } from "../redux/actions/dataActions";
import ConfirmationDialog from "./confirmDialog";
import axios from "../util/axios";
import {getCart} from "../redux/actions/dataActions";
import { SET_CART } from "../redux/types";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  details: {
    display: "flex",
    flexDirection: "column",
  },
  content: {
    flex: "1 0 auto",
  },
  cover: {
    height: "180",
    width: "60%",
  },
  snackbar: {
    width: "100%",
    "& > * + *": {
      marginTop: theme.spacing(2),
    },
  },
}));

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

export default function ItemCard(props) {
  console.log("At ItemCard.js");
  console.log(process.env.REACT_APP_CURRENCY);

  const classes = useStyles();
  const { title, imageUrl, description, price, _id } = props;
  const imageUrlSplit = imageUrl.split("\\");
  const imageURL = imageUrlSplit.join("/");
  const finalImageUrl = `${process.env.REACT_APP_SERVER_URL}/${imageURL}`; //3002 - server port

  const dispatch = useDispatch();

  const {
    authenticated,
    account: { role },
  } = useSelector((state) => state.auth);
  const { addCartSuccess, addCartFailReason } = useSelector((state) => state.data);
  
  const [open, setOpen] = useState(false);
  let openSnackBar=useSelector(state=>state.data.snackbar);
  // const [isOpenConfirmationDialog, setIsOpenConfirmationDialog] = useState(false);
  const [image, setImage] = useState(null);
  const { inputs, handleInputChange } = useForm({
    title: "",
    description: "",
    price: "",
  });

  const handleFileSelect = (event) => {
    setImage(event.target.files[0]);
  };

  const handleClose = () => {
    inputs.title = "";
    inputs.description = "";
    inputs.price = "";
    setImage(null);
    setOpen(false);
  };

  const handleSubmit = () => {
    const itemData = new FormData();
    if (image !== null) itemData.append("image", image);
    else itemData.append("image", imageUrl);
    itemData.append("title", inputs.title);
    itemData.append("description", inputs.description);
    itemData.append("price", inputs.price);
    dispatch(editItem(itemData, _id)); // eslint-disable-next-line
    handleClose();
  };

  const openEdit = () => {
    inputs.title = title;
    inputs.price = price;
    inputs.description = description;
    setOpen(true);
  };

  const handleDelete = () => {
    dispatch(deleteItem(_id));
  };

  const handleCart = () => {
    const itemData = {
      itemId: _id,
    };
    dispatch(addToCart(itemData));
  };

  const handleCloseSnackBar = (event, reason) => {
    if (reason === "clickaway") {
      dispatch({
        type:"SET_SNACKBAR",
        payload:false
      })
      return;
    }

    // setSnackBar(false);
    dispatch({
      type:"SET_SNACKBAR",
      payload:false
    })
  };

  // const handleSnackBar = (event, reason) => {
  //   if (addCartSuccess || addCartSuccess == null) setSnackBar(true);
  // };

  const handleClearCart=()=>{
    axios.delete(`/cart`)
    .then((cart)=>{
      // dispatch(getCart());
      dispatch({
        type: SET_CART,
        payload:{
          cart:[],
          price:0
        }
      })
    })
  };

  return (
    <>
      <Card className={classes.root} variant="outlined">
        <div className={classes.details}>
          <CardContent className={classes.content}>
            <Typography component="h5" variant="h5">
              {title}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary" noWrap>
              {description}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {process.env.REACT_APP_CURRENCY}
              {price}
            </Typography>
          </CardContent>
          {role === "ROLE_SELLER" ? (
            <div style={{ textAlign: "center" }}>
              <MyButton tip="Edit" onClick={openEdit}>
                <EditIcon style={{ color: "green" }} />
              </MyButton>
              <MyButton tip="Delete" onClick={handleDelete}>
                <DeleteIcon style={{ color: "#f44336" }} />
              </MyButton>
            </div>
          ) : authenticated ? (
            <Button
              color="secondary"
              style={{
                color: "#000",
                width: "60%",
                marginLeft: "20%",
                marginBottom: "10%",
              }}
              onClick={() => {
                handleCart();
                // handleSnackBar();
              }}
              variant="contained"
            >
              Add to Cart
            </Button>
          ) : (
            <Link to="/login">
              <Button
                color="secondary"
                style={{
                  color: "#000",
                  width: "60%",
                  marginLeft: "20%",
                  marginBottom: "10%",
                }}
                variant="contained"
              >
                Add to Cart
              </Button>
            </Link>
          )}
        </div>
        <CardMedia
          className={classes.cover}
          image={finalImageUrl}
          title="Item order"
        />
      </Card>
      <ItemDialog
        open={open}
        handleClose={handleClose}
        handleSubmit={handleSubmit}
        handleFileSelect={handleFileSelect}
        inputs={inputs}
        handleInputChange={handleInputChange}
      />
      <div className={classes.snackbar}>
        <Snackbar
          open={openSnackBar}
          autoHideDuration={3600}
          onClose={handleCloseSnackBar}
        >
          <Alert
            onClose={handleCloseSnackBar}
            style={{ backgroundColor: "#157a21" }}
          >
            Item added to cart!
          </Alert>
        </Snackbar>
      </div>
      {addCartFailReason==="MIX_CART"?(
        <ConfirmationDialog 
          open={true} 
          onClose={() => {dispatch(clearAddCartFailReason())}} // Function to close it
          onConfirm={handleClearCart} // Function to run on 'Yes' click
          title="Confirm Deletion"
          message="Cart can't contain mixed items from multiple stores. Do you want to clear the current cart?"
        />
      ):("")}
    </>
  );
}
