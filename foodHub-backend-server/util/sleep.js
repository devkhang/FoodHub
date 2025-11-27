const sleep=(timeout)=>{
    return new Promise((res)=>{
        setTimeout(() => {
            res();
        }, timeout);  
    })
}
module.exports=sleep;