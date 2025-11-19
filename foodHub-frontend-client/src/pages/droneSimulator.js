import axios from "axios";
import React, { useState } from "react";
import { useEffect } from "react";
import { useRef } from "react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import "../css/droneSimulator.css"
import * as turf from '@turf/turf';
import delay from "../util/delay";
import axiosInstance from "../util/axios";
const io= require("socket.io-client");

export default function DroneSimulator(props){
    const mapRef = useRef()
    const mapContainerRef = useRef()
    let travelDistance=0;
    let isArriveAtSeller=useRef(false);

    let [droneInfo, setDroneInfo]=useState(null);
    let droneStatus=useRef("IDLE");
    let [orderId, setOrderId]=useState(null);
    let orderIdRef=useRef(null);
    const getOrderIdState=()=>orderId;
    let sellerPosition=useRef({
        lng:null,
        lat:null
    });
    let customerPosition=useRef({
        lng:null,
        lat:null
    });
    let droneSpeed=useRef(10);
    let currentPosition=useRef({
        lng:null,
        lat:null
    });

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
    async function movingSimulation(counter=0, steps=0, point, map, route){
        // console.log("counter, steps:", counter, steps);
        
        if(counter==steps-1){
            console.log("destroy");
            return;
        }
        counter++;
        point.features[0].geometry.coordinates=route.features[0].geometry.coordinates[counter];
        // console.log("moving to", point.features[0].geometry.coordinates);
        currentPosition.current={
            lng:point.features[0].geometry.coordinates[0],
            lat:point.features[0].geometry.coordinates[1]
        };

        console.log("update-delivery-progress");
        
        socket.current.emit("update-delivery-progress",{
            orderId:orderId,
            geoJsonPosition:point,
            geojsonRoute:route
        });

        map.getSource("position").setData(point);


        await delay(100);
        await movingSimulation(counter, steps, point, map, route);
    }

    async function simulateDroneToSeller(map){
        let directionServiceURL=`${process.env.REACT_APP_MAPBOX_DIRECTION_URL}/driving/${currentPosition.current.lng},${currentPosition.current.lat};${sellerPosition.current.lng},${sellerPosition.current.lat}?geometries=geojson&access_token=${process.env.REACT_APP_MAPBOX_API_KEY}`;
        let result=await axios.get(directionServiceURL);
        let data=result.data;
        // let route=data.routes[0].geometry;
        const route = {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'geometry':data.routes[0].geometry
                }
            ]
        };
        let distance=turf.length(route.features[0]);
        // travelDistance+=distance;
        let step=droneSpeed.current;
        let distPerStep=distance/step;
        let progressPath=[];//coordinates that represent the movement from src to dest
        for(let i=0; i<=distance; i+=distPerStep){
            let progress=turf.along(route.features[0], i);
            progressPath.push(progress.geometry.coordinates);
        }
        route.features[0].geometry.coordinates=progressPath;

        let point = {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'properties': {},
                    'geometry': {
                        'type': 'Point',
                        'coordinates': currentPosition.current
                    }
                }
            ]
        };
        let src1=map.getSource("route");
        src1.setData(route);

        let src2=map.getSource("position");
        src2.setData(point);

        await movingSimulation(0, step, point, map, route)
        

    }
    async function simulateDroneToCustomer(map){
        let directionServiceURL=`${process.env.REACT_APP_MAPBOX_DIRECTION_URL}/driving/${currentPosition.current.lng},${currentPosition.current.lat};${customerPosition.current.lng},${customerPosition.current.lat}?geometries=geojson&access_token=${process.env.REACT_APP_MAPBOX_API_KEY}`;
        let result=await axios.get(directionServiceURL);
        let data=result.data;
        // let route=data.routes[0].geometry;
        const route = {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'geometry':data.routes[0].geometry
                }
            ]
        };
        let distance=turf.length(route.features[0]);
        travelDistance+=distance;
        let step=droneSpeed.current;
        let distPerStep=distance/step;
        let progressPath=[];//coordinates that represent the movement from src to dest
        for(let i=0; i<=distance; i+=distPerStep){
            let progress=turf.along(route.features[0], i);
            progressPath.push(progress.geometry.coordinates);
        }
        route.features[0].geometry.coordinates=progressPath;

        let point = {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'properties': {},
                    'geometry': {
                        'type': 'Point',
                        'coordinates': currentPosition.current
                    }
                }
            ]
        };

        let routeSource=map.getSource("route");
        if(!routeSource)
            map.addSource("route",route);
        else{
            routeSource.setData(route);
        }

        let positionSource=map.getSource("position");
        if(!positionSource)
            map.addSource("position",point);
        else{
            positionSource.setData(point);
        }

        await movingSimulation(0, step, point, map, route);
        result=await axios.put(`${process.env.REACT_APP_SERVER_URL}/delivery/finishDeliveryJob`,{
            droneId:droneInfo.droneId,
            orderId:orderIdRef.current,
            travelDistance:travelDistance
        });
        console.log("result after deliver order:", result.data.data);
        


    }
    async function droneDeliverySimulation(map){
        await simulateDroneToSeller(map);
        isArriveAtSeller.current=true;
        // await simulateDroneToCustomer(map);
        await axiosInstance.put("/delivery/delivery-arrive",{
            orderId:orderId,
            droneId:droneInfo.droneId
        });
        socket.current.emit("delivery:arrive",{
            orderId:orderId
        })
        
    }

    
    useEffect(()=>{
        if(!droneInfo)
            return ()=>{};
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
            console.log("drone:registerSocket");
            socket.current.emit("drone:registerSocket", droneInfo.droneId);

            //update current position in real time
            clearInterval(updatePositionInterval.current);
            updatePositionInterval.current=setInterval(()=>{
                // if(navigator.geolocation){//check if browser support GeoLocation API
                //     navigator.geolocation.getCurrentPosition((pos)=>{
                //     let dronePosition={
                //         "droneId":droneInfo.droneId,
                //         "lng":pos.coords.longitude,
                //         "lat":pos.coords.latitude
                //     }
                //     // console.log("Drone location:", JSON.stringify(dronePosition));
                //     // console.log("=================");
                    
                //     socket.current.emit("drone:updatePosition", dronePosition);
                //     })
                // }
                // else{
                //     alert("your browser doesn't support GeoLocation API");
                // }
                socket.current.emit("drone:updatePosition", {
                    droneId:droneInfo.droneId,
                    lng:currentPosition.current.lng,
                    lat:currentPosition.current.lat
                });
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

                    let data=result.data.data;
                    setOrderId(orderId);
                    orderIdRef.current=orderId
                    let sellerCoord={
                        lng:data.order.seller.sellerId.address.lng,
                        lat:data.order.seller.sellerId.address.lat,
                    };
                    console.log("sellerCoord", sellerCoord);
                    sellerPosition.current=sellerCoord;
                    let userCoord={
                        lng: data.order.user.address.lng,
                        lat: data.order.user.address.lat
                    };
                    customerPosition.current=userCoord;              
                }


            })
            

        })

    },[droneInfo]);

    useEffect(() => {
        // if(!orderId)
        //     return ()=>{};

        if(orderId){
            mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_API_KEY;
            mapRef.current = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: 'mapbox://styles/mapbox/streets-v12', // style URL
                center: [currentPosition.current.lng, currentPosition.current.lat], // starting position [lng, lat]
                zoom: 4 // starting zoom
            });

            let map=mapRef.current;
            // let origin=[currentPosition.current.lng, currentPosition.current.lng];
            // let destination=[sellerPosition.current.lng, sellerPosition.current.lng];
            // const route = {
            //     'type': 'FeatureCollection',
            //     'features': [
            //         {
            //             'type': 'Feature',
            //             'geometry': {
            //                 'type': 'LineString',
            //                 'coordinates': [origin, destination]
            //             }
            //         }
            //     ]
            // };
            let point = {
                'type': 'FeatureCollection',
                'features': [
                    {
                        'type': 'Feature',
                        'properties': {},
                        'geometry': {
                            'type': 'Point',
                            'coordinates': []
                        }
                    }
                ]
            };
            let route = {
                'type': 'FeatureCollection',
                'features': [
                    {
                        'type': 'Feature',
                        'geometry': {
                            'type': 'LineString',
                            'coordinates': []
                        }
                    }
                ]
            };

            map.on("load",async ()=>{
                map.addSource("route",{
                    type: 'geojson',
                    data:route
                });

                map.addSource("position",{
                    type:"geojson",
                    data:point
                });

                map.addLayer({
                    'id': 'route',
                    'source': 'route',
                    'type': 'line',
                    'paint': {
                        'line-width': 2,
                        'line-color': '#007cbf',
                        'line-emissive-strength': 1
                    }
                });

                map.addLayer({
                'id': 'currentPosition',
                'type': 'circle',
                'source': 'position',
                'paint': {
                    'circle-radius': 4,
                    'circle-color': '#fc1703'
                }
                })
                
                droneDeliverySimulation(map);

            })

            if(socket.current)
            {    
                socket.current.removeAllListeners("order_hand_over");
                socket.current.on("order_hand_over",({handOverOrderId})=>{
                    // let a=getOrderIdState();
                    if(orderIdRef.current!=handOverOrderId || !isArriveAtSeller.current){
                        return;
                    }
                    simulateDroneToCustomer(mapRef.current);
                })    
            }   

            return () => {
                mapRef.current.remove()
            }
        }
 

    }, [orderId])


    return (
        <div class="droneSimulator-container">
            <div class="droneSelection">
                <form class="droneSelection--form" onSubmit={(e)=>{
                        e.preventDefault();
                        let formData=new FormData(e.target);
                        let a=formData.get("droneLongitude");
                        currentPosition.current.lng=parseFloat(formData.get("droneLongitude"));
                        currentPosition.current.lat=parseFloat(formData.get("droneLatitude"));
                        droneSpeed.current=parseFloat(formData.get("droneSpeed"));
                        handleDroneSelection(formData.get("droneId"));
                    }}>
                    <label for="droneId">Drone id:</label><br/>
                    <input class="droneSelection--droneid" type="text" name="droneId" id="droneId" placeholder="Enter your drone id">
                    </input> <br/>
                    <label for="droneSpeed">Drone speed (in steps):</label><br/>
                    <input class="droneSelection--dronespeed" type="text" name="droneSpeed" id="droneSpeed" placeholder="Enter your drone speed">
                    </input> <br/>
                    <label for="droneSpeed">Longitude:</label><br/>
                    <input class="droneSelection--longitude" type="text" name="droneLongitude" id="droneLongitude" placeholder="Enter your drone logitude">
                    </input> <br/>
                    <label for="droneSpeed">Latitude:</label><br/>
                    <input class="droneSelection--latitude" type="text" name="droneLatitude" id="droneLatitude" placeholder="Enter your drone droneLatitude">
                    </input> <br/>
                    <button type="submit" style={buttonStyle}>Select drone</button>
                </form>
            </div>
            {(droneInfo)? (
                <div class="droneInfo">
                    <p class="droneInfo__droneid">Drone Id: {droneInfo.droneId}</p>
                    <p class="droneInfo__homebase"> Home base: longitude:{droneInfo.homeBase.lng}, latitude:{droneInfo.homeBase.lat}</p>
                </div>
            ):""}
            {(orderId)? (
                <div id="droneSimulation">
                    <li class="droneSimulation__actions">
                    </li>
                </div>
            ):""}
            
            <div id='map-container' ref={mapContainerRef}/>

        </div>
    )

}