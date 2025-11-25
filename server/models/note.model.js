import mongoose, { model, Schema } from "mongoose";

const collaboratorSchema=new Schema({
    user:{type:Schema.Types.ObjectId, required:true, ref:'User'},
    role:{type:String, default:'editor', enum:['owner','editor','viewer']}
})

const noteSchema= new Schema({
    title:{type:String,default:'Untitiled Note'},
    owner:{type:Schema.Types.ObjectId, ref:'User', required:true},
    docId:{type:String, required:true, index:true},
    collaborators:[collaboratorSchema],
    isPublic:{type:Boolean,default:true},
    joinCode:{
        type:String,
        unique:true,
        sparse:true,
        index:true
    },
    joinCodeExpiry:{type:Date},
    allowJoinViaCode:{type:Boolean,default:false}
    // tags:{String},
    // pinned:{type:Boolean,default:true},
    // lastActivityAt:{type:Date,default:Date.now},
    // cachedSummary:{String},
},{timestamps:true})

export default model("Note", noteSchema)