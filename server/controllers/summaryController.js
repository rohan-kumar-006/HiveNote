import dotenv from "dotenv"
dotenv.config({quiet:true})
import OpenAI from "openai"
import Note from "../models/note.model.js"
import Summary from "../models/summary.model.js"


// console.log(process.env.OPENAI_API_KEY)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

export const generateSummary = async (req, res) => {
    try {
        const { noteId } = req.params
        const { selectedText } = req.body
        const userId = req.userId
        
        //validate krlo ki kbhi selected text hi shi na ho
        if (!selectedText || selectedText.trim().length === 0) {
            return res.status(400).json({ error: "No text Selected" })
        }
        if (selectedText.trim().length > 5000) {
            return res.status(400).
                json({ error: "Selected text too long... Select maximum of 5000 characters" })
        }

        //check krlo ki note hai bhi ya nhi
        const note = await Note.findById(noteId)
        if (!note) {
            return res.status(404).
                json({ error: "Note not Found" })
        }

        //Verify if user has access to the note
        const hasAccess = note.owner.toString() === userId.toString() ||
            note.collaborators.some((c) => c.user.toString() === userId.toString())
        if (!hasAccess) {
            return res.status(403).json({ error: "You Dont have Access to make Changes" })
        }

        //rate limiting

        const today = new Date();
        today.setHours(0, 0, 0, 0)

        const todayCount = await Summary.countDocuments({
            generatedBy: userId,
            createdAt: { $gte: today }
        })

        if (todayCount >= 50) {
            return res.status(429).json({
                error: "Daily Limit Reached. You can generate upto 50 summaries per day"
            })
        }

        //Calling openAi api
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that summarizes text concisely and clearly."
                },
                {
                    role: "user",
                    content: `Please summarize the following text in 2-3 sentences:\n\n${selectedText}`
                }
            ],
            temperature: 0.7,
            max_completion_tokens: 200
        })

        const summaryText = completion.choices[0].message.content.trim()
        const tokenUsed = completion.usage.total_tokens

        //save to db

        const summary = await Summary.create({
            note: noteId,
            sourceText: selectedText,
            summary: summaryText,
            modelName: "gpt-5-nano",
            generatedBy: userId,
            tokenUsed: tokenUsed
        })
        await summary.populate("generatedBy", "name email")
        const response = {
            success: true,
            data: summary
        }

        res.status(200).json(response)
    } catch (error) {
        console.error("Summary Generation Error:", error)

        if (error.code == "insufficient_quota") {
            res.status(503).json({
                error: "AI service temporarily unavailable. Please try after some time"
            })
        }
        res.status(500).json({
            error: "Failed to generate summary. Please try again"
        })
    }
}
export const getNoteSummaries = async (req, res) => {
    try {
        const { noteId } = req.params
        const userId = req.userId
        // console.log(noteId,"NOteId")

        const note =await Note.findById(noteId)
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        // console.log(note.title,"NOte")
        // console.log(note.owner,'userId',userId)
        const hasAccess = note.owner.toString() === userId.toString() ||
            note.collaborators.some(c => c.user.toString() === userId.toString());

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const summaries = await Summary.find({ note: noteId }).sort({ createdAt: -1 })
            .limit(10).populate("generatedBy", "name email").lean()

        res.status(200).json({ success: true, data: summaries })
    } catch (error) {
        console.error("Fetch summaries error:", error)
        res.status(500).json({ error: "Failed to fetch summaries" })
    }
}