/*
droneId->{
    location:{
        lng:,
        lat:
    },
    updateTime:,
    socketId:
}
*/
exports.availableDrones=new Map();
//the reverse of availableDrones
/*
socketId->{
    droneId
}
*/
exports.socketToDrone=new Map();

//droneId
exports.busyDrone=new Map();

//droneId
exports.readyDrone=new Map();

/*
orderId->{
    droneId:,
    timeout:Js timeout,
    count: how many time this order is assigned,
    refuser:[accountId]
}
*/
exports.droneOrderAssignment=new Map();
