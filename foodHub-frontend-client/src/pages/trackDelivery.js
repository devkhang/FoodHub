import React from "react";
import { useEffect, useRef } from "react";
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css';
import { useSelector } from "react-redux";
import {registerTrackDelivery, trackDelivery, unRegisterTrackDelivery, unTrackDelivery} from "../socket/deliveryHandler"
import "../css/trackDelivery.css"

export default function TrackDelivery(props){
    const mapRef = useRef()
    const mapContainerRef = useRef()
    const deliveryTrackingData=useSelector((state)=>state.trackDelivery);


    useEffect(() => {
        //configure map
        mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_API_KEY;
        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12', // style URL
        });

        //initialize map to render
        const map=mapRef.current;
        map.on("load", ()=>{
            //add source to map, source is updated-> rerender map
            let point = {
                'type': 'FeatureCollection',
                'features': [
                    {
                        'type': 'Feature',
                        'properties': {},
                        'geometry': {
                            'type': 'Point',
                            // 'coordinates':[],
                            'coordinates': [106.574, 10.7]
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
            map.addSource("route",{
                type:"geojson",
                data:route
            });
            map.addSource("position",{
                type:"geojson",
                data:point
            });
            //add layer to render the source data
            //source get updated->rerender source
            map.addLayer({
                'id': 'route',
                'source': 'route',
                'type': 'line',
                'paint': {
                    'line-width': 2,
                    'line-color': '#007cbf',
                    'line-emissive-strength': 1
                }
            })
            map.addLayer({
                'id': 'currentPosition',
                'type': 'circle',
                'source': 'position',
                'paint': {
                    'circle-radius': 4,
                    'circle-color': '#fc1703'
                }
            })

            //register to the server to receive delivery update
            registerTrackDelivery(deliveryTrackingData.orderId);
            //handle server update about the delivery progress
            trackDelivery(map, "position", "route");

        })

        return () => {
            //unregister to the server to stop getting delivery update
            unRegisterTrackDelivery(deliveryTrackingData.orderId);
            //destroy listener for update about delivery progress
            unTrackDelivery();
            mapRef.current.remove()
        }
    }, [])


    return (
        <div class="trackdelivery-container">
            <div id='map-container' ref={mapContainerRef}/>
        </div>
    )
    
}