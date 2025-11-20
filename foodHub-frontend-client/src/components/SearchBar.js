import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import InputBase from "@material-ui/core/InputBase";
import Divider from "@material-ui/core/Divider";
import IconButton from "@material-ui/core/IconButton";
import MyLocation from "@material-ui/icons/MyLocation";
import LocationOn from "@material-ui/icons/LocationOn";
import SearchIcon from "@material-ui/icons/Search";
import axios from "axios";
import { fetchRestaurantsByAddress } from "../redux/actions/dataActions";
import debouncing from "../util/rateLimitting/debouncing";

const processAutoComplete = debouncing(async (input, setSuggestions) => {
  const response = await axios.get(
    `${process.env.REACT_APP_MAPBOX_GEOCODING}/forward?access_token=${
      process.env.REACT_APP_MAPBOX_API_KEY
    }&q=${encodeURIComponent(input)}&limit=${process.env.REACT_APP_AUTOCOMPLETE_LIMIT}`
  );
  // setSuggestions(response.data.predictions || []); goong
  setSuggestions(response.data.features || []);//mapbox
}, 2000);

const useStyles = makeStyles((theme) => ({
  rootHome: {
    padding: "2px 4px",
    display: "flex",
    alignItems: "center",
    width: 860,
  },
  rootItems: {
    padding: "2px 4px",
    display: "flex",
    alignItems: "center",
    width: 400,
    backgroundColor: "#edebeb",
  },
  rootCart:{
    padding: "2px 4px",
    display: "flex",
    flexDirection:"column",
    alignItems: "center",
    width: 860,
  },
  input: {
    marginLeft: theme.spacing(1),
    flex: 1,
    position: "relative",
  },
  inputCart:{
    marginLeft: theme.spacing(1),
    width:"100%",
    position: "relative",
  },
  results: {
    position: "absolute",
    bottom: -166,
    left: "26%",
    zIndex: 999,
    width: 760,
    height: "15%",
  },
  resultsCart:{
    bottom: -166,
    left: "26%",
    zIndex: 999,
    width: 760,
    height: "15%",
  },
  iconButton: {
    padding: 10,
  },
  divider: {
    height: 28,
    margin: 4,
  },
}));

export default function SearchBar(props) {
  const classes = useStyles();
  const [address, setAddress] = useState(
    localStorage.getItem("location") || ""
  );
  const page = props.page;
  const dispatch = useDispatch();

  const [suggestions, setSuggestions] = useState([]); // State cho gợi ý địa chỉ
  const [loading, setLoading] = useState(false); // State cho trạng thái tải

  /*
  get the current position via GeoLocation API,
  set the current position,
  get the formatted address of the current position,
  get nearby restaurant
  */
  const getBrowserLocation = () => {
    // console.log(12);
    navigator.geolocation.getCurrentPosition(
      function (position) {
        localStorage.setItem("latlng", `${position.coords.latitude}, ${position.coords.longitude}`);
        getUserAddressBy(position.coords.latitude, position.coords.longitude);
      },
      function (error) {
        alert("The Locator was denied, Please add your address manually");
      }
    );
  };

  /*
  receive the selected suggestion,
  set suggestion as the current location
  get (lng, lat) from the suggestion
  set the current (lng,lat) as the lng,lat) of the suggestion
  get restaurant closed to the current (lng, lat)
  */
  let handleSelect;
  if(props.onSelectAddress){
    if(page==="cart"){
      handleSelect = async (value) => {
        if (value === "") localStorage.removeItem("location");
        else localStorage.setItem("location", value);
        setAddress(value);
        setSuggestions([]); // Ẩn danh sách gợi ý sau khi chọn
        const latlng = await getLatLngFromMapBox(value); // Lấy tọa độ từ Goong API
        if (latlng) localStorage.setItem("latlng", `${latlng.lat}, ${latlng.lng}`);
        // fetchRestByLocation(latlng);
        props.onSelectAddress(value);
      };      
    }
  }
  else{
    //default: handleSelector for page===home
    handleSelect = async (value) => {
      if (value === "") localStorage.removeItem("location");
      else localStorage.setItem("location", value);
      setAddress(value);
      setSuggestions([]); // Ẩn danh sách gợi ý sau khi chọn
      const latlng = await getLatLngFromMapBox(value); // Lấy tọa độ từ Goong API
      if (latlng) localStorage.setItem("latlng", `${latlng.lat}, ${latlng.lng}`);
      fetchRestByLocation(latlng);
    };
  }

  const fetchRestByLocation = (latlng) => {
    dispatch(fetchRestaurantsByAddress(latlng.lat, latlng.lng));
    props.action(true);
  };

  const handleSearch = (event) => {
    props.handleSearch(event.target.value);
  };

  const getUserAddressBy = (lat, lng) => {
    const latlng = {
      lat: lat,
      lng: lng,
    };
    axios
      .get(
        // `${process.env.REACT_APP_GOONG_GEOCODE}?latlng=${lat},${long}&api_key=${process.env.REACT_APP_GOONG_API_KEY}` goong
        `${process.env.REACT_APP_MAPBOX_GEOCODING}/reverse?longitude=${lng}&latitude=${lat}&access_token=${process.env.REACT_APP_MAPBOX_API_KEY}`
      )
      //goong
      // .then((result) => {
      //   console.log(result.data);
      //   if (result.data.results[0]?.formatted_address === "")
      //     localStorage.removeItem("location");
      //   else
      //     localStorage.setItem(
      //       "location",
      //       result.data.results[0].formatted_address
      //     );
      //   setAddress(result.data.results[0].formatted_address);
      //   fetchRestByLocation(latlng);
      // })
      //mapbox
      .then((result) => {
        console.log(result.data);
        if (result.data.features[0]?.properties.full_address === "")
          localStorage.removeItem("location");
        else
          localStorage.setItem(
            "location",
            result.data.features[0].properties.full_address
          );
        setAddress(result.data.features[0].properties.full_address);
        fetchRestByLocation(latlng);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  // Hàm lấy latlng từ Goong API dựa trên địa chỉ
  const getLatLngFromGoong = async (address) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_GOONG_GEOCODE}?address=${encodeURIComponent(
          address
        )}&api_key=${process.env.REACT_APP_GOONG_API_KEY}`
      );
      const results = response.data.results;
      if (results.length > 0) {
        return results[0].geometry.location;
      }
      return null;
    } catch (error) {
      console.error("Error fetching latlng from Goong:", error);
      return null;
    }
  };

  const getLatLngFromMapBox = async (address) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_MAPBOX_GEOCODING}/forward?q=${encodeURIComponent(
          address
        )}&access_token=${process.env.REACT_APP_MAPBOX_API_KEY}`
      );
      const results = response.data.features;
      if (results.length > 0) {
        return {
          lng:results[0].geometry.coordinates[0],
          lat:results[0].geometry.coordinates[1]
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching latlng from Goong:", error);
      return null;
    }
  };

  // Hàm lấy gợi ý địa chỉ từ Goong API
  const fetchSuggestions = async (input) => {
    if (!input || input.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      // const response = await axios.get(
      //   `https://rsapi.goong.io/Place/Autocomplete?api_key=${
      //     process.env.REACT_APP_GOONG_API_KEY
      //   }&input=${encodeURIComponent(input)}`
      // );
      // setSuggestions(response.data.predictions || []);
      processAutoComplete(input, setSuggestions);
    } catch (error) {
      console.error("Error fetching suggestions from Goong API:", error);
      setSuggestions([]);
    }
    setLoading(false);
  };

  // Xử lý khi người dùng nhập hoặc thay đổi giá trị
  const handleInputChange = (event) => {
    const newValue = event.target.value;
    setAddress(newValue); // Cập nhật state address
    fetchSuggestions(newValue); // Lấy gợi ý dựa trên giá trị mới
  };

  // const handleGetSuggestionFromCurrentPosition=()=>{}

  return (
    <>
      <Paper
        component="form"
        className={page == "items" ? classes.rootItems:(
          page=="home"? classes.rootHome : (
            page=="cart"? classes.rootCart: ""
          )
        )}
      >
        {page === "home" && <LocationOn className={classes.iconButton} />}
        {page === "items" && (
          <InputBase
            className={classes.input}
            placeholder="Search Items"
            onChange={handleSearch}
            inputProps={{ "aria-label": "search for items" }}
          />
        )}
        {page === "home" && (
          <>
            <InputBase
              value={address}
              onChange={handleInputChange}
              placeholder="Enter delivery address"
              className={classes.input}
              inputProps={{
                "aria-label": "search goong maps for delivery address",
              }}
            />
            {loading && <div>Loading...</div>}
            {suggestions.length > 0 && (
              <div className={classes.results}>
                {suggestions.map((suggestion, index) => {
                  const style = suggestion.active
                    ? { backgroundColor: "#41b6e6", cursor: "pointer" }
                    : { backgroundColor: "#fff", cursor: "pointer" };
                  return (
                    <div
                      key={index}
                      onClick={() => handleSelect(suggestion.properties.full_address)}
                      style={style}
                    >
                      {suggestion.properties.full_address}
                    </div>
                  );
                })}
              </div>
            )}
            
          </>
          
        )}
        {page ==="cart"  && (
          <>
            <InputBase
              value={address}
              onChange={handleInputChange}
              placeholder="Enter delivery address"
              className={classes.inputCart}
              inputProps={{
                "aria-label": "search goong maps for delivery address",
              }}
            />
            {loading && <div>Loading...</div>}
            {suggestions.length > 0 && (
              <div className={classes.resultsCart}>
                {suggestions.map((suggestion, index) => {
                  const style = suggestion.active
                    ? { backgroundColor: "#41b6e6", cursor: "pointer" }
                    : { backgroundColor: "#fff", cursor: "pointer" };
                  return (
                    <div
                      key={index}
                      onClick={() => handleSelect(suggestion.properties.full_address)}
                      style={style}
                    >
                      {suggestion.properties.full_address}
                    </div>
                  );
                })}
              </div>
            )}
            
          </>
          
        )}
        <SearchIcon className={classes.iconButton} />
        {page === "home" && page!=="cart" && (
          <>
            <Divider className={classes.divider} orientation="vertical" />
            <IconButton
              color="primary"
              className={classes.iconButton}
              aria-label="directions"
              onClick={getBrowserLocation}
            >
              <MyLocation />
            </IconButton>
          </>
        )}
        
      </Paper>
      {/* {page==="home" && (
        <button class="current-position-suggestion-btn" onClick={()=>{}}>Current position</button>
      )} */}
    </>
  );
}
