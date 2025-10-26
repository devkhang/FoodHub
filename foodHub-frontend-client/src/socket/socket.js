// import { io } from "socket.io-client";
import * as io from 'socket.io-client';
let socket;

console.log("io:",io);


export function initSocket(serverURL){
    socket=io(serverURL);
    return socket;
}
export function getSocket(){
    if(!socket){
        throw new Error("Socket is not intialized");
    }
    return socket;
}