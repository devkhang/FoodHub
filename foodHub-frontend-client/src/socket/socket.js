// import { io } from "socket.io-client";
import * as io from 'socket.io-client';
let socket;

console.log("io:",io);


export function initSocket(serverURL){
    console.log("Connect delivery partner socket");
    
    socket=io(serverURL,{
        pingTimeout:10000
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