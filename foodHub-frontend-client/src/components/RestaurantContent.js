import React from "react";
import { useDispatch, useSelector } from "react-redux";

//M-UI
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";

import RestaurantCard from "./RestaurantCard";
import PaginationWithRedux from "./paginationWithRedux";
import { useState } from "react";
import { fetchRestaurantsByAddressPagination } from "../redux/actions/dataActions";

const RestaurantContent = () => {
  const { restaurants } = useSelector((state) => state.data);
  const restaurantArray = restaurants.restaurants;
  const [storeName, setStoreName]=useState("");
  const dispatch=useDispatch();

  const getRestaurantCard = (restaurantObj) => {
    return (
      <Grid item xs={12} sm={3} key={restaurantObj._id}>
        <RestaurantCard {...restaurantObj} />
      </Grid>
    );
  };
  const handleNameSearch=(e)=>{
    e.preventDefault();
    let formData=new FormData(e.target);
    let a=formData.get("storeName");
    let searchName=formData.get("storeName");
    setStoreName(searchName);
    let latlng=localStorage.getItem("latlng").split(",");
    latlng={
        lat:latlng[0],
        lng:latlng[1]
    }
    if(localStorage.getItem("location")){
      let urlQuery="";
      if(searchName!=null && searchName!="")
        urlQuery+=`storeName=${searchName}`;
      dispatch(fetchRestaurantsByAddressPagination(latlng.lat, latlng.lng, null, null, true, null, urlQuery))
    }
  }
  return (
    <>
      <Typography
        gutterBottom
        variant="h6"
        color="textPrimary"
        component="p"
        noWrap
      >
        Order from your favourite Eatery -
      </Typography>
      <br />
      <form class="store-name-search" onSubmit={handleNameSearch}>
        <input class="store-name-search__txtField" name="storeName" defaultValue={storeName}></input>
        <button>Search</button>
      </form>
      <Grid container spacing={2}>
        {restaurantArray ? (
          restaurantArray.length > 0 ? (
            restaurantArray.map((restaurant) => getRestaurantCard(restaurant))
          ) : (
            <p>
              No Restaurants currently available in your area, come back Later.
            </p>
          )
        ) : (
          <p>No suitable seller.</p>
        )}
      </Grid>
      {(restaurantArray && restaurantArray.length>0)?(
        <PaginationWithRedux for="store" storeName={storeName}/>
      ):("")}
    </>
  );
};

export default RestaurantContent;
