import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";

import {generateSummary,getNoteSummaries} from "../controllers/summaryController.js"

const router=express.Router()

router.post("/:noteId/summarize",authMiddleware,generateSummary);
router.get("/:noteId/summarize",authMiddleware,getNoteSummaries);

export default router;