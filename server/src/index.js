import dotenv from 'dotenv'
dotenv.config({ quiet: true })

import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import http from 'http'
import jwt from "jsonwebtoken"
import { Server } from 'socket.io'
import { errorMiddleware } from '../middlewares/error.middleware.js'
import Doc from "../models/doc.model.js"
import authRoutes from "../routes/auth.routes.js"
import noteRoutes from "../routes/note.routes.js"
import summaryRoutes from "../routes/summary.routes.js"
import { createSnapshotAndCompaction } from '../services/yjsPersistance.js'

const app = express()
const PORT = 5000
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: '*',
        credentials: true
    }
})
//
const activeDocuments = new Set()

//middleware yha hai
app.use(cors({
    origin: process.env.ORIGIN_URL || 'http://localhost:5173',
    credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
//Routes
app.use("/api/auth", authRoutes)
app.use("/api", noteRoutes)
app.use("/api/notes",summaryRoutes)

//Socket IO ka Authentication
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        socket.userId = decoded.userId
        next()
    } catch (error) {
        next(new Error("Authentication Error"))
    }
})

//SocketIO Connection Handling
io.on("connection", (socket) => {
    console.log("Socket Connected", socket.id)

    socket.on("joinDoc", (docId) => {
        console.log('👥 Socket', socket.id, 'joining docId:', docId)
        socket.join(docId)
        activeDocuments.add(docId)
    })

    socket.on("yjs-update", async ({ docId, updateBase64 }) => {
        try {

            const updateBuf = Buffer.from(updateBase64, 'base64')
            let doc = await Doc.findById(docId)

            if (!doc) {
                doc = await Doc.create({
                    _id: docId,
                    updates: [updateBuf],
                    version: 1
                })
            } else {
                const beforeCount = doc.updates.length
                doc.updates.push(updateBuf)
                doc.version += 1
                doc.lastSavedAt = new Date()
                await doc.save()

                if (doc.updates.length >= 50) {
                    await createSnapshotAndCompaction(docId)
                }
            }

            socket.to(docId).emit("yjs-update", { updateBase64, from: socket.id })
        } catch (err) {
            console.error(" Save yjs update failed:", err)
        }
    })
    socket.on("disconnect", () => {
        console.log("Socket disconnected", socket.id)
    })


    socket.on("presence", (payload) => {
        socket.to(payload.docId).emit("presenceUpdate", payload)
    })


    socket.on("requestDocState", async (docId) => {
        try {

            const doc = await Doc.findById(docId)

            if (!doc) {
                const note = await Note.findOne({ docId: docId })
                if (note) {
                    await Doc.create({
                        _id: docId,
                        updates: [],
                        snapshot: null,
                        version: 0
                    })
                }
                socket.emit("docState", { updateBase64: null })
                return
            }

            const Y = await import('yjs')
            const ydoc = new Y.Doc()

            if (doc.snapshot) {
                Y.applyUpdate(ydoc, new Uint8Array(doc.snapshot))
            }

            if (doc.updates && doc.updates.length > 0) {
                for (const buf of doc.updates) {
                    Y.applyUpdate(ydoc, new Uint8Array(buf))
                }
            }

            const state = Y.encodeStateAsUpdate(ydoc)

            socket.emit("docState", {
                updateBase64: Buffer.from(state).toString('base64')
            })

            ydoc.destroy()
        } catch (err) {
            socket.emit("docState", { updateBase64: null })
        }
    })
})
setInterval(async () => {
    for (const docId of activeDocuments) {
        try {
            const doc = await Doc.findById(docId)
            if (doc && doc.updates.length > 10) {
                await createSnapshotAndCompaction(docId)
            }
        } catch (error) {
            console.error(":Failed to create Snapshot for docId", docId)
        }
    }
}, 5 * 60 * 1000)

app.use(errorMiddleware)
mongoose.connect(process.env.MONGODB_URL).then(() => {
    server.listen(PORT, () => {
        console.log(`Your Server is running on port ${PORT}`)
    })
})