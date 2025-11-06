const path=require("path");
const dotenv=require("dotenv");
dotenv.config(path.join(__dirname,".env"));

let io;

module.exports = {
  init: (httpServer) => {
    io = require("socket.io")(httpServer,{
      pingTimeout: process.env.PING_TIMEOUT*1000,
      pingInterval:process.env.PINT_INTERVAL,
      connectionStateRecovery: {
        maxDisconnectionDuration:2*60*1000,//2 minutes
        skipMiddlewares: true
      }
    });

    io.on("connection", (socket)=>{
      socket.on("disconnect", (reason)=>{
        socket.disconnect();
      });
      socket.on("debug:hello", (mess)=>{
        console.log(`client ${socket.io} say ${mess}`);
      })

    });
    
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("socket.io is not initialized!");
    }
    return io;
  },
};
