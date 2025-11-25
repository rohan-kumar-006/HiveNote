import bcrypt from 'bcrypt'
import express from 'express'
import User from "../models/user.model.js"
import jwt from 'jsonwebtoken'

const router = express.Router()

router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body
        const existingUser = await User.findOne({ email })

        if (existingUser) {
            return res.status(400).json({
                error: "User already exists"
            })
        }

        const hashedPasswod = await bcrypt.hash(password, 10)
        const user = await User.create({
            name,
            email,
            password: hashedPasswod
        })

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        })

    } catch (err) {
        res.status(500).json({
            message: err.message
        })
    }
})

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await User.findOne({ email })

        if (!user) {
            return res.status(401).json({ error: "UserNotFound, SignUp First" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.status(400).json({ error: "Invalid Credentials" })
        }
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

export default router