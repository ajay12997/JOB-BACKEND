const express = require("express");
const multer = require("multer");
const {uploadResume, getResume, getAllResumes}  = require("../controllers/uploadController");
const {authMiddleware} = require("../middleware/authMiddleware");

const router = express.Router();

// Use memory storage (no local storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload", authMiddleware, upload.single("resume"), uploadResume);
router.get("/resume/:user_id", getResume);
router.get("/resumes", getAllResumes);

module.exports = router;
