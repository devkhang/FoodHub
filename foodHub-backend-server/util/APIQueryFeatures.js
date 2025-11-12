class APIQueryFeatures{
    constructor(query, queryString, model){
        this.query=query;//query is a instance of Mongoose Query
        this.queryString=queryString//Query string is req.query of Express
        this.model=model//Mongoose Model
    }
    filter(){
        const excludedFields=["fields", "sort", "page", "limit"];
        let queryObj={...this.queryString};
        excludedFields.forEach(el=>delete queryObj[el]);

        queryObj=JSON.stringify(queryObj).replace(/\b(gte|gt|lt|lte)\b/g, match=>`$${match}`);        
        queryObj=JSON.parse(queryObj);
        
        this.query.find(queryObj);

        return this;
    }
    sorting(){
        if(this.queryString.sort){
            let sortBy=this.queryString.sort.split(",").join(" ");
            this.query.sort(sortBy);
        }
        else{
            this.query.sort("-createdAt");
        }
        return this;
    }
    limitFields(){
        if(this.queryString.fields){
            let limitingFields=this.queryString.fields.split(",").join(" "); 
            this.query.select(limitingFields);
        }
        else{
            this.query.select("-__v");
        }
    }
    async pagination(){
        let page=this.queryString.page*1 ||1;
        let limit=this.queryString.limit*1 ||2;
        let skip=(page-1)*limit;
        let noDocument=await this.model.countDocuments();
        if(skip>=noDocument){
            throw new Error("This page doesn't exist");
        }
        this.query.skip(skip).limit(limit);
    }

}


module.exports=APIQueryFeatures;