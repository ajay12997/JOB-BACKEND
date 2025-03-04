const express = require("express");
const multer = require("multer");
const {uploadResume, getResume, getAllResumes,deleteResume}  = require("../controllers/uploadController");
const {authMiddleware} = require("../middleware/authMiddleware");
const RecommendedJob = require("../models/RecommendedJob");
const Resume = require("../models/resumes");
const router = express.Router();

// Use memory storage (no local storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload", authMiddleware, upload.single("resume"), uploadResume);
router.get("/resume",authMiddleware, getResume);
router.delete("/delete",authMiddleware, deleteResume);
router.get("/resumes", getAllResumes);



// Get recommended jobs for a user
router.get("/user/:userId/recommended-jobs", async (req, res) => {
  try {
    const { userId } = req.params;

    const recommendations = await RecommendedJob.find({ user_id: userId }).populate("job_id");

    res.json({ success: true, recommendations });
  } catch (error) {
    console.error("Error fetching recommended jobs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
module.exports = router;
