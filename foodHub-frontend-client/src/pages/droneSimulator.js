import axios from "axios";
import React, { useState } from "react";
import { useEffect } from "react";
import { useRef } from "react";
const io= require("socket.io-client");

export default function DroneSimulator(props){

    let [droneInfo, setDroneInfo]=useState(null);
    let droneStatus=useRef("IDLE");

    async function handleDroneSelection(droneId){
        let result=await axios.get(`${process.env.REACT_APP_SERVER_URL}/drone/getDrone/${droneId}`);
        
        //[not done: doesn't handle error, or show error]
        if(result.data.status==="ok"){
            let droneInfo=result.data.data;
            setDroneInfo(droneInfo);
        }
    }

    const buttonStyle = {
        // CSS property names are converted from kebab-case (font-size) to camelCase (fontSize)
        backgroundColor: 'darkblue', 
        color: 'white',
        padding: '10px 20px',
        borderRadius: '5px',
        border: 'none',
        marginRight: '10px' // Example of camelCase
    };
    let socket=useRef(null);
    let updatePositionInterval=useRef(null);

    // useEffect(async ()=>{
    //     console.log("initial useEffect");
        
    //     socket.current=io(`${process.env.REACT_APP_SERVER_URL}`);
    //     socket.current.on("disconnect", (reason, details) => {
    //         console.log("socket disconnected with reason:", reason);
    //         console.log("detail:", details);
            
    //     });
    //     console.log("socket", socket.current);
    // },[])

    useEffect(()=>{
        if(!droneInfo)
            return;
        droneStatus.current="IDLE";
        // console.log("drone selection useEffect");
        if(socket.current)
        {
            socket.current.close();
            console.log("close socket", socket.id);
            
        }
        socket.current=io(`${process.env.REACT_APP_SERVER_URL}`);
        socket.current.on("disconnect", (reason, details) => {
            console.log("socket disconnected with reason:", reason);
            console.log("detail:", details);
            clearInterval(updatePositionInterval.current);
            
        });
        console.log("socket", socket.current);

        // socket.current.connect();//reconnect
        // console.log("reconnect:", socket.current, socket.current.connected);
        socket.current.on("connect",()=>{
            console.log("on-connection: configure drone client socket");
            
            //register drone socket with server
            socket.current.emit("drone:registerSocket", droneInfo.droneId);

            //update current position in real time
            clearInterval(updatePositionInterval.current);
            updatePositionInterval.current=setInterval(()=>{
                if(navigator.geolocation){//check if browser support GeoLocation API
                    navigator.geolocation.getCurrentPosition((pos)=>{
                    let dronePosition={
                        "droneId":droneInfo.droneId,
                        "lng":pos.coords.longitude,
                        "lat":pos.coords.latitude
                    }
                    // console.log("Drone location:", JSON.stringify(dronePosition));
                    // console.log("=================");
                    
                    socket.current.emit("drone:updatePosition", dronePosition);
                    })
                }
                else{
                    alert("your browser doesn't support GeoLocation API");
                }

            }, 1000)

            //order delivery job notification
            socket.current.on("delivery:job_notification", async ({orderId, timeout})=>{
                console.log("delivery:job_notification");
                let status=droneStatus.current;
                console.log("droneStatus",status);
                
                
                if(status!=="IDLE"){
                    console.log(`refuse deliver order ${orderId}`);
                    
                    let result=await axios.post(`${process.env.REACT_APP_SERVER_URL}/delivery/drone-refuse-job`,{
                        droneId:droneInfo.droneId,
                        orderId:orderId
                    })
                    console.log("result:", result.data.data);
                    
                }
                else if(status=="IDLE"){
                    console.log(`accept deliver order ${orderId}`);
                    
                    let result=await axios.post(`${process.env.REACT_APP_SERVER_URL}/delivery/drone-accept-job`,{
                        droneId:droneInfo.droneId,
                        orderId:orderId
                    })
                    console.log("result:", result.data.data);
                    //[not done: start drone delivery]                    
                }


            })
            
        })

    },[droneInfo]);

    return (
        <div>
            <div class="droneSelection" onSubmit={(e)=>{
                e.preventDefault();
                let formData=new FormData(e.target);
                handleDroneSelection(formData.get("droneId"));
            }}>
                <form class="droneSelection--form">
                    <label for="droneId">Drone id:</label><br/>
                    <input class="droneSelection--droneid" type="text" name="droneId" id="droneId" placeholder="Enter your drone id">
                    </input> <br/>
                    <button type="submit" style={buttonStyle}>Select drone</button>
                </form>
            </div>
            {(droneInfo)? (
                <div>
                    <div class="droneInfo">
                        <p class="droneInfo__droneid">Drone Id: {droneInfo.droneId}</p>
                        <p class="droneInfo__homebase"> Home base: longitude:{droneInfo.homeBase.lng}, latitude:{droneInfo.homeBase.lat}</p>
                    </div>
                    <div id="droneSimulation">
                        <li class="droneSimulation__actions">
                        </li>
                    </div>
                </div>
            ):""}

        </div>
    )

}