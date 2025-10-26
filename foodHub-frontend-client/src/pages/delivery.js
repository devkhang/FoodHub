import React, { useState } from "react";
import { useHistory } from "react-router";
import { useDispatch, useSelector } from "react-redux";

//material-ui
import makeStyles from "@material-ui/core/styles/makeStyles";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import TextField from "@material-ui/core/TextField";
import CircularProgress from "@material-ui/core/CircularProgress";

//custom-hook
import useForm from "../hooks/forms";

// Đảm bảo import action signupDelivery
import { signupDelivery } from "../redux/actions/authActions";

const useStyles = makeStyles((theme) => ({
  ...theme.spreadThis,
  root: {
    flexGrow: 1,
    marginTop: 40,
  },
  paper: {
    padding: theme.spacing(2),
  },
  address: {
    "& > *": {
      margin: theme.spacing(4),
      width: "25ch",
    },
  },
}));

export default function AddDelivery() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const history = useHistory();
  const [portraitImages, setPortraitImages] = useState(null);
  const [licenseFrontImages, setLicenseFrontImages] = useState(null);
  const [licenseBackImages, setLicenseBackImages] = useState(null);
  let imageError;

  const { loading, serverError, errorDelivery } = useSelector(
    (state) => state.UI
  );

  const { message, errors } = errorDelivery || {};
  console.log("message : ",message);
  console.log("errors : ", errors);

  if (message) {
    if (message.includes("Upload an image")) imageError = message;
  }

  const handlePortraitSelect = (event) => {
    if (event.target.files[0]) {
      setPortraitImages(event.target.files[0]);
    }
  };

  const handleLicenseFrontSelect = (event) => {
    if (event.target.files[0]) {
      setLicenseFrontImages(event.target.files[0]);
    }
  };

  const handleLicenseBackSelect = (event) => {
    if (event.target.files[0]) {
      setLicenseBackImages(event.target.files[0]);
    }
  };

  //error variables
  let emailError = null;
  let passwordError = null;
  let confirmPasswordError = null;
  let PhoneError = null;
  let FirstNameError = null; // Đã khai báo
  let LastNameError = null; // Đã khai báo
  let CCCDError = null;
  if (errors) {
    console.log("errors:", errors);

    for (let error of errors) {
      if (error.msg.includes("valid email")) emailError = error.msg;
      if (error.msg.includes("Email address already")) emailError = error.msg;
      if (error.msg.includes("least 6 characters long"))
        passwordError = error.msg;
      if (error.msg.includes("Passwords have to"))
        confirmPasswordError = error.msg;
      if(error.msg.includes("firstName Could not be")) FirstNameError = error.msg;
      if(error.msg.includes("lastName Could not be")) LastNameError = error.msg;
      if(error.msg.includes("Enter a valid 10"))PhoneError = error.msg;
      if(error.msg.includes("The CCCD (Vietnamese Citizenship ID Card) number must consist of exactly 12 digits"))CCCDError = error.msg
      if(error.msg.includes("The CCCD must not be"))CCCDError = error.msg
      if(error.msg.includes("The CCCD must be 12"))CCCDError = error.msg
      if(error.msg.includes("The CCCD must only contain numerical digits"))CCCDError = error.msg
      if(error.msg.includes("The CCCD (National ID Card) already exists in the system"))CCCDError = error.msg
      if(error.msg.includes("The province/city code in"))CCCDError = error.msg
      if(error.msg.includes("The gender/century code in the CCCD"))CCCDError = error.msg
      if(error.msg.includes("The year of birth in the CCCD"))CCCDError = error.msg
    }
  }

  /* Đã sửa logic FormData và gọi action signupDelivery */
  const signupDeliveryHandle = (props) => {
    // Kiểm tra xem đã tải lên đủ 3 ảnh chưa
    if (!portraitImages || !licenseFrontImages || !licenseBackImages) {
      alert("Vui lòng tải lên đủ 3 ảnh theo yêu cầu.");
      return;
    }

    const formData = new FormData();

    // Gửi ảnh (chỉ gửi một file, không cần lặp)
    formData.append("portrait", portraitImages);
    formData.append("licenseFront", licenseFrontImages);
    formData.append("licenseBack", licenseBackImages);

    // Gửi các trường dữ liệu
    formData.append("firstName", inputs.FirstName);
    formData.append("lastName", inputs.LastName);
    formData.append("email", inputs.email);
    formData.append("phone", inputs.phone); // Đảm bảo key là 'phone'
    formData.append("password", inputs.password);
    formData.append("confirmPassword", inputs.confirmPassword);
    formData.append("CCCD", inputs.CCCD);
    formData.append("role", "delivery");

    dispatch(signupDelivery(formData, history));
  };

  const { inputs, handleInputChange, handleSubmit } = useForm(
    {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      CCCD:""
    },
    signupDeliveryHandle
  );

  return (
    <div className={classes.root}>
      <Grid container>
        <Grid item xs={1} />
        <Grid item xs={7}>
          <Paper className={classes.paper} elevation={2}>
            <Grid container>
              <Grid item sm>
                <Typography
                  variant="h4"
                  className={classes.title}
                  style={{ textAlign: "center" }}
                >
                  Add a Delivery Account{" "}
                  {/* Đã sửa tiêu đề nếu đây là trang đăng ký Shipper */}
                </Typography>
                <Typography
                  variant="body1"
                  component="p"
                  style={{ margin: "10px 10px 2px 10px" }}
                >
                  Basic Info - Get Started
                </Typography>
                <form noValidate onSubmit={handleSubmit}>
                  <Grid container alignItems="center" spacing={1}>
                    {" "}
                    {/* Grid container bọc toàn bộ */}
                    {/* ... (Các phần upload ảnh) ... */}
                  </Grid>

                  <Grid container alignItems="center" spacing={1}>
                    <Grid item>
                      <Typography
                        variant="body2"
                        component="p"
                        style={{ margin: "0 0.625rem 0 0.625rem" }}
                      >
                        Enter portrait photo:
                      </Typography>
                    </Grid>
                    <Grid item>
                      <input
                        accept="image/*"
                        className={classes.uploadImages}
                        name="portraitPhoto"
                        id="portrait-button-file"
                        type="file"
                        onChange={handlePortraitSelect}
                      />
                    </Grid>
                    {imageError && (
                      <Grid item>
                        <Typography
                          variant="body2"
                          component="p"
                          style={{ color: "#f44336" }}
                        >
                          Upload an Image as well
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item>
                      <Typography
                        variant="body2"
                        component="p"
                        style={{ margin: "0 0.625rem 0 0.625rem" }}
                      >
                        Import front driver's license photo:
                      </Typography>
                    </Grid>
                    <Grid item>
                      <input
                        accept="image/*"
                        name="licenseFrontPhoto"
                        className={classes.uploadImages}
                        id="license-front-button-file"
                        type="file"
                        onChange={handleLicenseFrontSelect}
                      />
                    </Grid>
                    {imageError && (
                      <Grid item>
                        <Typography
                          variant="body2"
                          component="p"
                          style={{ color: "#f44336" }}
                        >
                          Upload an Image as well
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item>
                      <Typography
                        variant="body2"
                        component="p"
                        style={{ margin: "0 0.625rem 0 0.625rem" }}
                      >
                        Enter the back of your driver's license photo
                      </Typography>
                    </Grid>
                    <Grid item>
                      <input
                        accept="image/*"
                        className={classes.uploadImages}
                        name="licenseBackPhoto"
                        id="license-back-button-file"
                        type="file"
                        onChange={handleLicenseBackSelect}
                      />
                    </Grid>
                    {imageError && (
                      <Grid item>
                        <Typography
                          variant="body2"
                          component="p"
                          style={{ color: "#f44336" }}
                        >
                          Upload an Image as well
                        </Typography>
                      </Grid>
                    )}
                  </Grid>

                  {/* FIRST NAME FIELD (Đã sửa name và value) */}
                  <TextField
                    id="delivery FirstName"
                    name="FirstName" // Đã sửa tên thành FirstName
                    label="First Name"
                    className={classes.textField}
                    placeholder="Nguyễn"
                    onChange={handleInputChange}
                    value={inputs.FirstName} // Đã sửa value
                    helperText={FirstNameError} // Dùng biến lỗi mới
                    error={FirstNameError ? true : false} // Dùng biến lỗi mới
                    fullWidth
                    required
                  />
                  {/* LAST NAME FIELD (Đã sửa name và value) */}
                  <TextField
                    id="delivery LastName"
                    name="LastName" // Đã sửa tên thành LastName
                    label="Last Name"
                    placeholder="Duy"
                    className={classes.textField}
                    onChange={handleInputChange}
                    value={inputs.LastName} // Đã sửa value
                    helperText={LastNameError} // Dùng biến lỗi mới
                    error={LastNameError ? true : false} // Dùng biến lỗi mới
                    fullWidth
                    required
                  />
                  {/* PHONE FIELD (Đã sửa name và value) */}
                  <TextField
                    id="phone"
                    name="phone" // Đã sửa tên thành phone (chuẩn hóa key)
                    label="Phone"
                    placeholder="+84908534618"
                    className={classes.textField}
                    onChange={handleInputChange}
                    value={inputs.phone} // Đã sửa value
                    helperText={PhoneError}
                    error={PhoneError ? true : false}
                    fullWidth
                    required
                  />
                  <TextField
                    id="email"
                    name="email"
                    label="email"
                    placeholder="khangau98@gmail.com"
                    className={classes.textField}
                    onChange={handleInputChange}
                    value={inputs.email}
                    helperText={emailError}
                    error={emailError ? true : false}
                    // Lưu ý: type="number" cho email là bất thường. Có lẽ bạn muốn type="email"
                    fullWidth
                    required
                  />
                  <TextField
                    id="password"
                    name="password"
                    type="password"
                    label="Password"
                    className={classes.textField}
                    onChange={handleInputChange}
                    value={inputs.password}
                    helperText={passwordError}
                    error={passwordError ? true : false}
                    fullWidth
                    required
                  />
                  <TextField
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    label="Confirm Password"
                    className={classes.textField}
                    onChange={handleInputChange}
                    value={inputs.confirmPassword}
                    helperText={
                      passwordError ? passwordError : confirmPasswordError
                    }
                    error={
                      passwordError ? true : confirmPasswordError ? true : false
                    }
                    fullWidth
                    required
                  />
                  <TextField
                    id="CCCD"
                    name="CCCD"
                    label="CCCD"
                    placeholder="....."
                    className={classes.textField}
                    onChange={handleInputChange}
                    value={inputs.CCCD}
                    helperText={CCCDError}
                    error={CCCDError ? true : false}
                    // Lưu ý: type="number" cho email là bất thường. Có lẽ bạn muốn type="email"
                    fullWidth
                    required
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    className={classes.button}
                    fullWidth
                    disabled={loading}
                  >
                    Submit
                    {loading && (
                      <CircularProgress
                        size={30}
                        className={classes.progress}
                      />
                    )}
                  </Button>
                  <br />
                  <small
                    className={classes.small}
                    style={{ marginLeft: "400px" }}
                  >
                    delivery with FoodHub to have more interesting trip
                  </small>
                </form>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        {/* ... (Phần Get Started) ... */}
        <Grid item xs={3} style={{ marginLeft: "40px" }}>
          <Paper
            className={classes.paper}
            style={{ backgroundColor: "#e3e3e8" }}
            elevation={2}
          >
            <Typography
              gutterBottom
              variant="h5"
              noWrap
              style={{ textAlign: "center" }}
            >
              Get Started in just 3 steps
              <br />
              <br />
            </Typography>
            <Typography
              variant="body2"
              color="textPrimary"
              style={{ marginLeft: "30px", fontSize: "16px" }}
            >
              1. Tell us about yourself. <br /> {/* Đã sửa nội dung */}
              2. Verify your Email. <br />
              3. Access Delivery Dashboard and go &nbsp;&nbsp;&nbsp;&nbsp;live.{" "}
              {/* Đã sửa nội dung */}
              <br />
              <br />
              <br />
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={1} />
      </Grid>
    </div>
  );
}
