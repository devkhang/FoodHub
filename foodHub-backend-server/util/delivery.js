const haversine = require('haversine-distance')

/* 
input:
-origin: {lng, lat}
-objectLocations:[{
    id: object Id,
    pos:{
        lng.
        lat
    }
}]
-dest: {lng, lat}
-acceptRange: the acceptable range in Km, when an object's distance <= acceptRange, top searching
output:
-ans:{
    id: suitable object id,
    dist: dist form the selected object to the origin
},
-excludeObjectId:[] //object Id to exclude
*/
exports.getClosestObjectBetweenOriginDest=(origin, objectLocations, dest, acceptRange, maxAcceptRange,excludeObjectId=[])=>{
    // console.log("getObjectNearAPlace()");
    // console.log("input:", objectLocations);
    if(!objectLocations.length){
        return null;
    }
    
    let ans={
        id:null,
        dist: Number.MAX_SAFE_INTEGER
    }
    for(let obj of objectLocations){
        if(excludeObjectId.includes(obj.id))
            continue;

        let dist=haversine(origin, obj.pos)/1000;
        dist+=haversine(origin, dest)/1000;

        if(dist<=acceptRange)
            return {
                id:obj.id,
                dist:dist
            }
        
        if(dist>maxAcceptRange){
            continue;
        }
        else if(dist<ans.dist){
            ans.id=obj.id;
            ans.dist=dist;
        }
    }
    return (ans.id!==null)?ans:null;
}

/*
input:
-orderId: id
-sellerLocation:[{
    acountId: accountId of the delivery partner,
    location:{
        lng:,
        lat:
    }
}]
-deliveryPartnerLocations=[{
    id: delivery partner account id,
    pos:{
        lng:,
        lat:
    }
}]
-deliveryPartnerSocketMap: acountId->{
    socketId:
}
-io: socket io server instance to send notification to the next selected delivery partner
*/


/*
input:
-map:JS Map
-isSelectKey: boolean //whether to select map.key as id in new array
-valueFieldSelection:{
    name of field to select:true
}
*/
exports.convertMapToArray=(map, isSelectKey, valueFieldSelection)=>{
    return Array.from(map.entries()).map(([id, info])=>{
        let element={}
        for(let field of valueFieldSelection){
            if(valueFieldSelection[field]){
                element[field]=valueFieldSelection[field]
            }
        }
        return element;
    })
}