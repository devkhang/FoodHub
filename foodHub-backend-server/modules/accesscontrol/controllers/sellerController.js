const Order = require("../../order/models/order");
const Account = require("../models/account");
const Seller = require("../models/seller");

exports.updateStatus=async (req, res, next)=>{
    try {
        let email=req.body.email;
        let status=req.body.status;
        let account=await Account.findOne({"email":email});
        let seller=await Seller.findOne({"account":account._id});
        if(status==="active"){
            seller.isActive=true;
        }
        else if(status==="inactive"){
            seller.isActive=false;
        }
        else{
            throw new Error("Invalid seller status");
            
        }
        await seller.save();
        res.status(200).json({
            status:"ok"
        });

    } catch (error) {
        next(error, req, res, next);
    }

}

exports.deleteSellerViaEmail=async (req, res, next)=>{
    try {
        let email=req.params.email;
        let account=await Account.findOne({"email":email});
        let seller=await Seller.findOne({"account":account._id});
        await Seller.findByIdAndDelete(seller._id);
        await Account.findByIdAndDelete(account._id);
        res.status(200).json({
            status:"ok"
        });

    } catch (error) {
        next(error, req, res, next);
    }
}

exports.hasOrder=async (req, res, next)=>{
    try {
        let sellerId=req.query.sellerId;
        let order=await Order.findOne({
            "seller.sellerId":sellerId
        })
        if(order){
            res.status(200).json({
                status:"ok",
                data:true
            })
        }
        else{
            res.status(200).json({
                status:"ok",
                data:false
            })
        }
        
    } catch (error) {
        next(error, req, res, next);
    }
}

exports.hasIncompletedOrder=async (req, res, next)=>{
    try {
        let sellerId=req.query.sellerId;
        let order=await Order.findOne({
            "seller.sellerId":sellerId,
            status:{
                $nin:["Cancelled", "Completed"]
            }
        })
        if(order){
            res.status(200).json({
                status:"ok",
                data:true
            })
        }
        else{
            res.status(200).json({
                status:"ok",
                data:false
            })
        }
        
    } catch (error) {
        next(error, req, res, next);
    }
}