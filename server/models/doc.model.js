import mongoose ,{Schema,model} from "mongoose";

const docSchema=new Schema({
    _id:{type:String,required:true},
    updates:[{type:Buffer}],
    snapshot:{type: Buffer},
    version:{type:Number,default:0},
    lastSavedAt:{type:Date, default:Date.now}
},{timestamps:true,_id:false})

export default model("Doc",docSchema)
