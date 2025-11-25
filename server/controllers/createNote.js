import mongoose, { models } from "mongoose";
import Note from "../models/note.model.js"
import Doc from "../models/doc.model.js"

export const createNote=async(req,res,next)=>{
    try{

        const userId=req.userId
        const title =req.body.title || "Untitled"
        
        const docId = new mongoose.Types.ObjectId().toString()
        
        const note=  await Note.create({
            title,
            owner:userId,
            docId,
            collaborators:[{user:userId,role:'owner'}]
        })
        await Doc.create({
            _id:docId,
            updates:[],
            snapshot:null,
            version:0
        })
        res.status(200).json(note)
    }catch(error){
        res.status(500).json({error : error.message})
    }
}