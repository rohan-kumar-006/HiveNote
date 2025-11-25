import express from 'express'
import Note from "../models/note.model.js"
import Doc from "../models/doc.model.js"
import { v4 as uuidv4 } from 'uuid'
import { authMiddleware } from '../middlewares/auth.middleware.js'
import { messageAuth } from 'y-websocket'
import crypto from "crypto"
import { join } from 'path'
const router = express.Router()


router.post("/notes", authMiddleware, async (req, res) => {
    try {
        const { title } = req.body
        const note = await Note.create({
            title,
            owner: req.userId,
            docId: uuidv4(),
            collaborators: [{
                user: req.userId,
                role: 'owner'
            }]
        })
        await Doc.create({
            _id: note.docId,
            updates: [],
            snapshot: null,
            version: 0
        })
        res.status(200).json(note)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.get("/notes", authMiddleware, async (req, res) => {
    try {
        const notes = await Note.find({
            $or: [
                { owner: req.userId },
                { 'collaborators.user': req.userId }
            ]
        }).populate('owner', 'name email')
        res.status(200).json({ notes })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

router.get("/notes/:id", authMiddleware, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id)
            .populate("owner", "name email")
            .populate("collaborators.user", "name email")

        if (!note) {
            return res.status(404).json({ message: "Note not found" })
        }

        const hasAccess = note.owner._id.toString() === req.userId ||
            note.collaborators.some((m) => m.user._id.toString() === req.userId) ||
            note.isPublic

        if (!hasAccess) {
            return res.status(403).json({ message: "You dont have access to the document" })
        }
        const noteData = {
            ...note.toObject(),
            docId: note.docId || note._id.toString() // Fallback to _id if docId doesn't exist
        };
        res.status(200).json(noteData)
    } catch (err) {
        console.error("Error fetching note:", err);
        res.status(500).json({ message: err.message });
    }
})

router.put("/notes/:id", authMiddleware, async (req, res) => {
    try {
        const { title, isPublic } = req.body
        const note = await Note.findById(req.params.id)

        if (!note) {
            return res.status(404).json({ error: "Not Found" })
        }

        const canEdit = note.owner.toString() === req.userId ||
            note.collaborators.some(c =>
                c.user.toString() === req.userId &&
                ["owner", "editor"].includes(c.role)
            )

        if (!canEdit) {
            return res.status(403).json({ error: "Edit access denied" })
        }

        if (title !== undefined) note.title = title
        if (isPublic !== undefined) note.isPublic = isPublic

        await note.save()

        res.json(note)

    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
})
router.delete("/notes/:id", authMiddleware, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id)
        // console.log("firsta")
        // console.log("note")

        if (!note) {
            return res.status(404).json({ message: "Note not Found" })
        }
        
        if (note.owner.toString() !== req.userId) {
            return res.status(403).json({ message: "Only Owner can delete the Note" })
        }
       
        if (note.docId) {
            const doc = await Doc.findByIdAndDelete(note.docId)
            if (doc) {
                console.log('🗑️ Deleted Doc:', note.docId)
            }
        }
        // console.log(doc)
        // console.log(note)
        
        await note.deleteOne()
        res.status(200).json({ message: "Note deleted successfully" })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

//Generating Codes Routes

router.post("/notes/:id/generate-code", authMiddleware, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id)
        if (!note) {
            return res.status(404).json({ error: "Note not found" })
        }

        if (note?.owner.toString() !== req.userId) {
            return res.status(403).json({ error: "Only owner can generate the join code" })
        }
        const joinCode = crypto.randomBytes(4).toString("hex").toUpperCase()
        console.log(joinCode)
        const expiry = new Date()
        expiry.setDate(expiry.getDate() + 7)

        note.joinCode = joinCode
        note.joinCodeExpiry = expiry
        note.allowJoinViaCode = true
        await note.save()

        res.status(200).json({
            joinCode,
            expiresAt: expiry,
            shareUrl: `${process.env.CLIENT_URL}/join/${joinCode}`
        })

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

    router.post("/notes/:id/revoke-code", authMiddleware, async (req, res) => {
        try {
            const note = await Note.findById(req.params.id)

            if (!note) {
                return res.status(404).json({ error: "Note not found" })
            }

            if (note.owner.toString() !== req.userId) {
                return res.status(403).json({ error: "Only owner can revoke join codes" })
            }
            note.joinCode = null
            note.joinCodeExpiry = null
            note.allowJoinViaCode = false
            await note.save()
            res.json({ message: "Join Code Revoked" })

        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    })

router.post("/notes/join", authMiddleware, async (req, res) => {
    try {

        const { joinCode } = req.body
        if (!joinCode) {
            return res.status(400).json({ error: "Join code is Required" })
        }
        console.log("inside joincode route")
        const note = await Note.findOne({
            joinCode: joinCode.toUpperCase(),
            allowJoinViaCode: true
        })
            .populate("owner", "name email")

        if (!note) {
            return res.status(404).json({ error: "Invalid Join Code or expired" })
        }
        //checking ki join code expire to nhi hogya

        if (note.joinCodeExpiry && new Date() > note.joinCodeExpiry) {
            return res.status(400).json({ error: "Join Code Expired" })
        }
        const isAlreadyCollaborator = note.collaborators.some(c => c.user.toString() === req.userId)

        if (isAlreadyCollaborator) {
            return res.json({
                message: "You are already a collaborator",
                noteId: note._id
            })
        }

        note.collaborators.push({
            user: req.userId,
            role: "editor"
        })
        await note.save()
        res.status(200).json({
            message: "Succesfully Joined the Note",
            noteId: note._id,
            note: {
                _id: note._id,
                title: note.title,
                owner: note.owner
            }
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})
router.get("/notes/:id/collaborators", authMiddleware, async (req, res) => {
    try {
        const note=await Note.findById(req.params.id)
        .populate("collaborators.user","name email")
        .populate("owner","name email")

        if (!note) {
            return res.status(404).json({ error: "Note not found" })
        }

        const hasAccess=note.owner._id.toString()===req.userId ||
        note.collaborators.some(c=>c.user._id.toString()===req.userId)

        if (!hasAccess) {
            return res.status(403).json({ error: "Access denied" })
        }
        res.json({
            collaborators:note.collaborators,
            owner:note.owner,
            joinCode:note.allowJoinViaCode? note.joinCode : null 
        })

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.delete("/notes/:id/collaborators/:userId", authMiddleware, async (req, res) => {
    try {
        const note=await Note.findById(req.params.id)

        if (!note) {
            return res.status(404).json({ error: "Note not found" })
        }

        if(note.owner.toString()!==req.userId){
            res.status(403).json({error:"Only owner can remove the collaborator"})
        }

        note.collaborators=note.collaborators.filter(u=>c.user.toString()!==req.params.userId)
        await note.save()

        res.json({
            messaage:"Collaborator Removed Successfully"
        })

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

export default router;