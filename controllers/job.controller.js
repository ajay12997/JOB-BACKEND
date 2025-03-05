const JobPost = require("../models/jobPost");
const Application = require('../models/Application');
const matches = require("../models/match");
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
    
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    try {
        let skills = req.body.skills;
        const recruiter_id = req.user.user_id;

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


// List all jobs with  Search filters 

const getAllJobs = async (req, res) => {
    try {
        const user_id = req.user.user_id; // Extract user_id from authenticated user
        const { search = "", page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Decode URL-encoded search query (handles spaces)
        const decodedSearch = decodeURIComponent(search);

        let searchQuery = {};

        if (decodedSearch.trim().length > 0) {
            searchQuery.$or = [
                { title: { $regex: decodedSearch, $options: "i" } },
                { description: { $regex: decodedSearch, $options: "i" } },
                { skills: { $regex: decodedSearch, $options: "i" } },
                { location: { $regex: decodedSearch, $options: "i" } }
            ];
        }

        const jobs = await JobPost.find(searchQuery)
            .sort({ posted_date: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalJobs = await JobPost.countDocuments(searchQuery);


        // Fetch job listings with isApplied field
        const jobsWithAppliedStatus = await Promise.all(
            jobs.map(async (job) => {
                const isApplied = await Application.exists({ job_id:job._id, user_id});
                return { ...job._doc, isApplied: !!isApplied }; 
            })
        );

        res.status(200).json({
            jobs: jobsWithAppliedStatus,
            totalJobs,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalJobs / parseInt(limit)),
        });


    } catch (error) {
        res.status(500).json({ message: "Error fetching jobs", error: error.message });
    }
};


// Get details of a specific job
const getJobById = async (req, res) => {
    try {
        const user_id = req.user.user_id; // Extract user_id from authenticated user
        const job_id = req.params.id;

        // Fetch job details
        const job = await JobPost.findById(job_id);
        if (!job) return res.status(404).json({ message: "Job not found" });

        // Check if the user has already applied for this job
        const isApplied = await Application.exists({ job_id, user_id });

        res.status(200).json({
            ...job._doc,
            isApplied: !!isApplied 
        });

    } catch (error) {
        res.status(500).json({ message: "Error fetching job", error: error.message });
    }
};

// fetch jobs posted by perticular recruiter with search filter
const getJobsByRecruiter = async (req, res) => {
    try {
        const recruiterId = req.user.user_id; // Extract recruiter_id from token

        if (!recruiterId) {
            return res.status(403).json({ message: "Unauthorized: Recruiter ID missing" });
        }

        // Extract query parameters
        const { search = "", page = 1, limit = 10 } = req.query;

        let filter = { recruiter_id: recruiterId };

        if (search.trim()) {
            const decodedSearch = decodeURIComponent(search).trim();
            const searchRegex = new RegExp(decodedSearch, "i"); // Case-insensitive search

            filter.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { location: searchRegex },
                { education: searchRegex },
                { skills: searchRegex },
                { company: searchRegex },  
                { jobType: searchRegex },  
                { salary: searchRegex }    
            ];
        }

        // Pagination logic
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;

        // Fetch filtered jobs with pagination
        const jobs = await JobPost.find(filter)
            .sort({ posted_date: -1 })
            .skip(skip)
            .limit(pageSize);

        // Get total matching jobs count
        const totalJobs = await JobPost.countDocuments(filter);
        const totalPages = Math.ceil(totalJobs / pageSize);

        res.status(200).json({
            totalJobs,
            totalPages,
            currentPage: pageNumber,
            pageSize,
            jobs
        });
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

const getRecommendedJobs = async (req, res) => {
    try {
        const user_id = req.user?.user_id;
        if (!user_id) {
            return res.status(400).json({ message: "User ID is missing" });
        }

        console.log("userid", user_id);

        // Fetch top recommended jobs sorted by match score
        const matchedJobs = await matches.find({ user_id }).sort({ score: -1 });
        console.log("Matched Jobs:", matchedJobs);

        // Extract job IDs and store scores in a map
        const jobScoreMap = {};
        const recommendedJobIds = matchedJobs
            .map(match => {
                if (!match.job_id) {
                    console.warn("Skipping match with missing job_id:", match);
                    return null;
                }
                jobScoreMap[match.job_id.toString()] = match.score;
                return match.job_id;
            })
            .filter(Boolean); // Remove null values

        console.log("JobScoreMap:", jobScoreMap);
        console.log("Recommended Job IDs:", recommendedJobIds);

        // Fetch recommended job details
        const recommendedJobs = await JobPost.find({ _id: { $in: recommendedJobIds } });

        // Add match score to each recommended job
        const recommendedJobsWithScore = recommendedJobs.map(job => ({
            ...job._doc,
            match_score: jobScoreMap[job._id.toString()] || 0
        }));

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Fetch other jobs excluding recommended ones with pagination
        const jobs = await JobPost.find({ _id: { $nin: recommendedJobIds } })
            .skip(skip)
            .limit(limit);

        // Count total other jobs (for frontend pagination)
        const totalOtherJobs = await JobPost.countDocuments({ _id: { $nin: recommendedJobIds } });

        // Send response
        res.status(200).json({
            recommendedJobs: recommendedJobsWithScore,
            jobs,
            totalOtherJobs,
            currentPage: page,
            totalPages: Math.ceil(totalOtherJobs / limit)
        });

    } catch (error) {
        console.error("Error fetching recommended jobs:", error);
        res.status(500).json({ message: "Error fetching recommended jobs", error: error.message });
    }
};

  
module.exports = { createJob, getAllJobs, getJobById, getJobsByRecruiter, deleteJob, updateJob,getRecommendedJobs};
