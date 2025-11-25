import mongoose, { Schema, model } from "mongoose";

const summarySchema = new Schema({
    note: {
        type: Schema.Types.ObjectId,
        ref:"Note",
        required: true,
        index:true
    },
    sourceText: {
        type: String,
        required:true,
        maxLength:5000
    },
    summary:{
        type:String,
        required:true
    },
    modelName: {
        type: String,
        default:"gpt-5-nano"
    },
    generatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required:true
    },
    tokenUsed:{
        type:Number
    }
}, { timestamps: true })

summarySchema.index({note:1,createdAt:-1})
summarySchema.index({generatedBy:1,createdAt:-1})

export default model("Summary", summarySchema)
