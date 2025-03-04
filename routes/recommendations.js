const express = require("express");
const router = express.Router();
const RecommendedJob = require("../models/RecommendedJob");

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
