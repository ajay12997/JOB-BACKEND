const JobPost = require("../models/JobPost");
const { body, validationResult } = require("express-validator");


const validateJobPost = [
    body("job_title").notEmpty().withMessage("Title is required"),
    body("location").notEmpty().withMessage("Location is required"),
    body("job_type").notEmpty().withMessage("Job type is required"),
    body("experience").notEmpty().withMessage("Experience is required"),
];

// Create a new job (Employer)
const createJob = async (req, res) => {
    const errors = validationResult(req);
    console.log(req.body);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    try {
        let skills = req.body.skills;
        const recruiter_id = req.user.user_id;
        console.log(recruiter_id);
        if (typeof skills === "string") {
            skills = skills.split(",").map(skill => skill.trim());
        } else if (!Array.isArray(skills)) {
            skills = []; // Default to empty array if skills is missing or invalid
        }

        const job = new JobPost({ ...req.body, skills, recruiter_id});

        await job.save();
        res.status(201).json({ message: "Job posted successfully", job });
    } catch (error) {
        res.status(500).json({ message: "Error creating job", error: error.message });
    }
};


// List all jobs with filters
const getAllJobs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        // const skip = (page - 1) * limit;

        let query = {};
        if (req.query.location) query.location = req.query.location;
        if (req.query.job_type) query.job_type = req.query.job_type;
        if (req.query.experience) query.experience = req.query.experience;

        const jobs = await JobPost.find(query)
            .sort({ posted_date: -1 })
            // .skip(skip)
            .limit(limit);

        const totalJobs = await JobPost.countDocuments(query);

        res.status(200).json({
            jobs,
            totalJobs,
            currentPage: page,
            totalPages: Math.ceil(totalJobs / limit),
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching jobs", error: error.message });
    }
};


// Get details of a specific job
const getJobById = async (req, res) => {
    try {
        const job = await JobPost.findById(req.params.id);
        if (!job) return res.status(404).json({ message: "Job not found" });
        res.status(200).json(job);
    } catch (error) {
        res.status(500).json({ message: "Error fetching job", error: error.message });
    }
};

// fetch jobs posted by perticular recruiter
const getJobsByRecruiter = async (req, res) => {
    try {
        const recruiterId = req.user.user_id; // Extract recruiter_id from token

        if (!recruiterId) {
            return res.status(403).json({ message: "Unauthorized: Recruiter ID missing" });
        }

        const jobs = await JobPost.find({ recruiter_id: recruiterId }).sort({ posted_date: -1 });

        if (!jobs.length) {
            return res.status(404).json({ message: "No jobs found for this recruiter" });
        }

        res.status(200).json({ jobs });
    } catch (error) {
        res.status(500).json({ message: "Error fetching recruiter jobs", error: error.message });
    }
};


// Remove a job posting (Employer)
const deleteJob = async (req, res) => {
    try {
        const job = await JobPost.findByIdAndDelete(req.params.id);
        if (!job) return res.status(404).json({ message: "Job not found" });
        res.status(200).json({ message: "Job deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting job", error: error.message });
    }
};


//  update job
const updateJob = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if job exists
        let job = await JobPost.findById(id);
        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }

        // Update job details
        const updatedJobData = { ...req.body };

        // If updating skills, ensure it's stored as an array
        if (req.body.skills) {
            updatedJobData.skills = Array.isArray(req.body.skills)
                ? req.body.skills
                : req.body.skills.split(",").map(skill => skill.trim());
        }

        // Apply changes
        job = await JobPost.findByIdAndUpdate(id, updatedJobData, { new: true });

        res.status(200).json({ message: "Job updated successfully", job });
    } catch (error) {
        res.status(500).json({ message: "Error updating job", error: error.message });
    }
};

module.exports = { createJob, getAllJobs, getJobById, getJobsByRecruiter, deleteJob, updateJob };
