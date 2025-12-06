const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const dotenv = require("dotenv");
dotenv.config(path.join(__dirname, ".env"));

//Socket
const { init, getIO } = require("./util/socket");
let io;
const {registerDeliveryPartner, trackDeliveryPartnerLocation}=require("./socket/handlers/deliveryPartnerHandler");
const {droneUpdatePositionHandler, droneSocketRegistration, droneCutConnection}=require("./socket/handlers/droneHandler")
const {accountIdToSocket}=require("./socket/sources/clientSource")

//Route
const authRoutes = require("./modules/accesscontrol/route/auth");
const itemRoutes = require("./modules/menu/route/item");
const userRoutes = require("./modules/order/route/user");
const deliveryRoutes = require("./modules/Delivery/route/delivery");
const authController = require("./modules/accesscontrol/controllers/authController");
const stripeRoutes = require("./modules/Payment/route/stripe");
const webhook = require("./modules/Payment/route/webhook")
const droneRoute=require("./modules/accesscontrol/route/droneRoute");
const { trackDelivery, registerTrackDelivery, unRegisterTrackDelivery, deliveryArrive } = require("./socket/handlers/deliveryHandler");
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    //[not done: this is still relative to the CWD]
    cb(null, path.join("images"));
  },
  filename: (req, file, cb) => {
    cb(
      null,
      Math.floor(Math.random() * 90000) + 10000 + "-" + file.originalname
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/jpg"
  )
    cb(null, true);
  else cb(null, false);
};

const app = express();
const upload = multer({ storage: fileStorage, fileFilter: fileFilter });
app.use("/webhook",webhook);
app.use(bodyParser.json());
app.use(
  "/images",
  (req, res, next) => {
    console.log("client request an image", req.url);
    next();
  },
  express.static(path.join(__dirname, "images"))
);
//set headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
app.use("/Payment", stripeRoutes);

app.use("/auth", authRoutes);
app.use("/delivery", deliveryRoutes);
// app.use("/auth", authRoutes);
app.use("/seller", upload.single("image"), itemRoutes);
app.use("/drone", droneRoute);
app.use(userRoutes);

app.get('/greet', (req, res) => {
  res.send('Hello, World!');
});

//error middleware
const handleMixCart=(req,res)=>{
  return res.status(400).json({
    status:"fail",
    message:"MIX_CART"
  });
}

app.use((error, req, res, next) => {
  console.error(error.stack);
  const statusCode = error.statusCode || 500;
  const message = error.message;
  let errorsPresent;
  if (error.errors) {
    errorsPresent = error.errors;
  }

  if(message==="MIX_CART"){
    handleMixCart(req, res);
  }

  res.status(statusCode).json({
    message: message,
    errors: errorsPresent,
  });
});

const clients = {};
if (process.env.NODE_ENV !== "test") {
  mongoose
    .connect(process.env.MONGODH_URL)
    .then((result) => {
      console.log("Connected to db");
      const server = app.listen(process.env.PORT, () => {
        console.log(`Server starts at port ${process.env.PORT}`);
      });

      let io = init(server);
      io.on("connection", (socket) => {
        socket.on("add-user", (data) => {
          clients[data.userId] = {
            socket: socket.id,
          };
          accountIdToSocket.set(data.userId, socket.id)
        });

        //Removing the socket on disconnect
        socket.on("disconnect", () => {
          for (const userId in clients) {
            if (clients[userId].socket === socket.id) {
              delete clients[userId];
              break;
            }
          }
        });
      });

      // registerDeliveryPartner();
      // trackDeliveryPartnerLocation();
      droneUpdatePositionHandler();
      droneSocketRegistration();
      droneCutConnection();

      //drone delivery
      registerTrackDelivery();
      unRegisterTrackDelivery();
      trackDelivery();
      deliveryArrive();

  })
  .catch((err) => console.log(err));  
}

exports.clients = clients;

module.exports = app;
