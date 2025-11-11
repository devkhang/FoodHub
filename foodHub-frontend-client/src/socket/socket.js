// import { io } from "socket.io-client";
import * as io from 'socket.io-client';
let socket;

console.log("io:",io);


export function initSocket(serverURL){
    console.log("Socket to server");
    
    socket=io(serverURL,{
        pingTimeout:process.env.PING_TIMEOUT*1000
    });
    socket.on("connect", ()=>{
        console.log("debug test hello connection");
        socket.emit("debug:hello", "hi")
    });
    socket.on("disconnect",  (reason, details)=>{
        console.log("socket disconnect with reason");
        console.log("reason", reason);
        console.log("details", details);
        
        socket.disconnect();
    });
    return socket;
}
export function getSocket(){
    if(!socket){
        throw new Error("Socket is not intialized");
    }
    return socket;
}