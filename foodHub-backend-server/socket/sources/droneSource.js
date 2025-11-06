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
exports.busyDrone=[];

//droneId
exports.readyDrone=[];

/*
droneId->{
    accountId of delivery partner:,
    timeout:Js timeout,
    count: how many time this order is assigned,
    refuser:[accountId]
}
*/
exports.droneOrderAssignment=new Map();
