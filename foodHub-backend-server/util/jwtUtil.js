const jwt=require("jsonwebtoken");
const {promisify}=require("node:util")

exports.verifyJWT=async (jwtToken)=>{
    try{
        if(!jwtToken){
            return {
                status:"error",
                mess:"jwtToken is null"
            };
        }
        // console.log("jwt:", jwtToken);
        
        let decodedJwtToken=await promisify(jwt.verify)(jwtToken, process.env.JWT_SECRET_KEY);
        return {
            status:"ok",
            data:decodedJwtToken
        };
    }
    catch(err){
        console.log("verifyJWT", err);
        return {
                status:"error",
                mess:err.message
        };
    }
}