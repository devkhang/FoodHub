// foodHub-backend-server/server.js
const mongoose = require("mongoose");
const app = require("./app"); // ← lấy app từ file kia
const { init } = require("./util/socket");

// Socket handlers
const { droneUpdatePositionHandler, droneSocketRegistration, droneCutConnection } = require("./socket/handlers/droneHandler");
const { registerTrackDelivery, unRegisterTrackDelivery, trackDelivery, deliveryArrive } = require("./socket/handlers/deliveryHandler");

const clients = {};
global.clients = clients; // nếu cần dùng ở nơi khác

// CHỈ CHẠY KHI KHÔNG PHẢI TEST
  mongoose
    .connect(process.env.MONGODH_URL)
    .then(() => {
      console.log("Connected to db");

      const server = app.listen(process.env.PORT || 3001, () => {
        console.log(`Server running on port ${process.env.PORT || 3001}`);
      });

      // Khởi tạo Socket.IO
      const io = init(server);
      io.on("connection", (socket) => {
        socket.on("add-user", (data) => {
          clients[data.userId] = { socket: socket.id };
        });

        socket.on("disconnect", () => {
          for (const userId in clients) {
            if (clients[userId].socket === socket.id) {
              delete clients[userId];
              break;
            }
          }
        });
      });

      // Khởi động các handler
      droneUpdatePositionHandler();
      droneSocketRegistration();
      droneCutConnection();
      registerTrackDelivery();
      unRegisterTrackDelivery();
      trackDelivery();
      deliveryArrive();
    })
    .catch((err) => {
      console.log(err));
    }