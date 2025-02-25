const express = require("express");
const { createJob, getAllJobs, getJobById, deleteJob,updateJob } = require("../controllers/job.controller");
const { authMiddleware, authorizeRecruiter } = require("../middleware/authMiddleware");
const router = express.Router();

// Job API routes
router.post("/jobCreate", authMiddleware, authorizeRecruiter, createJob);  // Create job
router.get("/jobFetch", getAllJobs);  // Get all jobs with filters
router.get("/jobFetch/:id", getJobById);  // Get a specific job
router.delete("/jobDelete/:id", authMiddleware, authorizeRecruiter, deleteJob);  // Delete a job
router.put("/jobUpdate/:id", authMiddleware, updateJob); // Update a job

module.exports = router;
