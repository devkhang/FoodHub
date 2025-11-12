import React from "react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {fetchRestaurantsByAddressPagination} from "../redux/actions/dataActions";
import { useEffect } from "react";

/*
the expected structure of props such that this pagination
works with redux
{
    for: order, store, drone
}
*/

const PaginationWithRedux =(props)=>{
    const { restaurants } = useSelector((state) => state.data);
    const restaurantArray = restaurants.restaurants;
    // const [currentPage, setCurrentPage]=useState(1);
    let currentPage=useSelector(state=>state.pagination.page)
    const dispatch=useDispatch();
    let latlng=localStorage.getItem("latlng").split(",");
    latlng={
        lat:latlng[0],
        lng:latlng[1]
    }

    const handlePageClick=(type)=>{
        console.log(`type:${type}`);

        if(props.for==="store"){
            let urlQuery='';
            if(props.storeName)
                urlQuery+=`storeName=${props.storeName}`;
            if(type==="first")
                dispatch(fetchRestaurantsByAddressPagination(latlng.lat, latlng.lng, null, null, true, null, urlQuery));
            else if(type==="prev"){
                if(currentPage>1)
                    dispatch(fetchRestaurantsByAddressPagination(latlng.lat, latlng.lng, currentPage-1, null, null, null, urlQuery));
            }
            else if(type==="next"){
                dispatch(fetchRestaurantsByAddressPagination(latlng.lat, latlng.lng, currentPage+1, null, null, null, urlQuery));
            }
            else if(type==="last"){
                dispatch(fetchRestaurantsByAddressPagination(latlng.lat, latlng.lng, null, null, null, true, urlQuery));
            }
        }

        // if(type==="first"){
        //     setCurrentPage(1);
        // }
        // else if(type==="prev" && ){
        //     setCurrentPage(currentPage-1);
        // }
        // else if(type==="next" && paginationResult.isOk){
        //     setCurrentPage(currentPage+1);
        // }
        
    }


    return (
        <div class="pagination">
            <button onClick={()=>handlePageClick("first")} class="pagination__firstBtn">&lt;&lt;First</button>
            <button onClick={()=>handlePageClick("prev")} class="pagination__prevBtn">&lt;Prev</button>
            <p class="pagination_current-page">{currentPage}</p>
            <button onClick={()=>handlePageClick("next")} class="pagination__nexttBtn">Next&gt;</button>
            <button onClick={()=>handlePageClick("last")} class="pagination__lastBtn">Last&gt;&gt;</button>
        </div>
    )
}

export default PaginationWithRedux;