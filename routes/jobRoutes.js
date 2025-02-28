const express = require("express");
const { createJob, getAllJobs, getJobById,getJobsByRecruiter, deleteJob,updateJob } = require("../controllers/job.controller");
const { authMiddleware, authorizeRecruiter } = require("../middleware/authMiddleware");
const router = express.Router();

// Job API routes
router.post("/jobCreate", authMiddleware, authorizeRecruiter, createJob);  // Create job
router.get("/jobFetch", getAllJobs);  // Get all jobs with filters
router.get("/jobFetch/:id", authMiddleware, getJobById);  // Get a specific job
router.get("/jobByRecruiter", authMiddleware, getJobsByRecruiter); 
router.delete("/jobDelete/:id", authMiddleware, authorizeRecruiter, deleteJob);  // Delete a job
router.put("/jobUpdate/:id", authMiddleware, updateJob); // Update a job

module.exports = router;
