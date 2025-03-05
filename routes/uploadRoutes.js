const express = require("express");
const multer = require("multer");
const {uploadResume, getResume, getAllResumes,deleteResume}  = require("../controllers/uploadController");
const {authMiddleware} = require("../middleware/authMiddleware");
const Resume = require("../models/resumes");
const router = express.Router();

// Use memory storage (no local storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload", authMiddleware, upload.single("resume"), uploadResume);
router.get("/resume",authMiddleware, getResume);
router.delete("/delete",authMiddleware, deleteResume);
router.get("/resumes", getAllResumes);

module.exports = router;
