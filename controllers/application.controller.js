const Application = require('../models/Application');
const JobPost = require('../models/jobPost');
const resume = require('../models/resumes');
const User = require('../models/user');
const mongoose = require('mongoose');

// post applications
const postApplication = async (req, res) => {
    try {
        const { job_id } = req.query;
        const user_id = req.user.user_id; // Extracted from token

        // Check if the job exists
        const job = await JobPost.findById(job_id);
        if (!job) return res.status(404).json({ message: "Job not found" });

        // Prevent recruiters from applying
        if (req.user.role !== 3) {
            return res.status(403).json({ message: "Only job seekers can apply" });
        }

        // Fetch the latest resume for this user
        const Resume = await resume.findOne({ user_id }).sort({ createdAt: -1 }); // Get most recent resume
        if (!Resume) {
            return res.status(400).json({ message: "No resume found. Please upload a resume before applying." });
        }

        // Prevent duplicate applications
        const existingApplication = await Application.findOne({ job_id, user_id });
        if (existingApplication) {
            return res.status(400).json({ message: "You have already applied for this job" });
        }

        // Create new application with resume details
        const application = new Application({
            job_id,
            user_id,
            resume_id: Resume._id,
            current_file_url: Resume.current_file_url, 
        });

        await application.save();

        res.status(201).json({
            message: "Application submitted successfully",
            application,
        });

    } catch (error) {
        res.status(500).json({ message: "Error applying for job", error: error.message });
    }
};


// fetch applications by user 
const getApplicationsByUser = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { page = 1, limit = 10 } = req.query; // Pagination params

        console.log("user_id", user_id);

        // Fetch total count of applications
        const totalApplications = await Application.countDocuments({ user_id });

        // Implement pagination
        const applications = await Application.find({ user_id })
            .select("job_id match_score createdAt updatedAt") 
            .sort({ createdAt: -1 }) // Sort by createdAt in descending order
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        if (!applications.length) {
            return res.status(404).json({ message: "No applications found" });
        }

        // Fetch job details separately
        const jobIds = applications.map(app => app.job_id);
        const jobs = await JobPost.find({ _id: { $in: jobIds } });

        // Map job details to applications
        const applicationsWithJobs = applications.map(app => ({
            ...app._doc,
            job_details: jobs.find(job => job._id.toString() === app.job_id.toString()) || " ",
            isApplied: true 
        }));

        // console.log("applicationsWithJobs", applicationsWithJobs);

        res.status(200).json({
            total_applications: totalApplications,
            current_page: parseInt(page),
            total_pages: Math.ceil(totalApplications / limit),
            applications: applicationsWithJobs
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching applications", error: error.message });
    }
};


// fetch Applied Candidates for Recruiter's Jobs
const getApplicationsForRecruiter = async (req, res) => {
    try {
        const recruiter_id = req.user.user_id;
        const { job_id, search = "", page = 1, limit = 10 } = req.query; // Pagination & search

        if (req.user.role !== 2) {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        // Check if the job exists and belongs to this recruiter
        const job = await JobPost.findOne({ _id: job_id, recruiter_id });
        if (!job) {
            return res.status(404).json({ message: "Job not found or not posted by you" });
        }

        // Decode search query (handles spaces, special characters)
        const decodedSearch = decodeURIComponent(search).trim();

        // Build search query for applications
        let applicationQuery = { job_id };

        if (decodedSearch.length > 0) {
            // Find matching users
            const matchingUsers = await User.find({
                $or: [
                    { skills: { $regex: decodedSearch, $options: "i" } },
                    { education: { $regex: decodedSearch, $options: "i" } },
                    { name: { $regex: decodedSearch, $options: "i" } },
                    { aboutMe: { $regex: decodedSearch, $options: "i" } },
                    { currentLocation: { $regex: decodedSearch, $options: "i" } }
                ]
            }).select("_id"); // Fetch only user IDs

            // Extract matching user IDs
            const matchingUserIds = matchingUsers.map(user => user._id.toString());

            // Filter applications by matching user IDs
            applicationQuery.user_id = { $in: matchingUserIds };
        }

        // Get total applications count (for pagination)
        const totalApplications = await Application.countDocuments(applicationQuery);

        // Fetch paginated applications
        const applications = await Application.find(applicationQuery)
            .select("user_id resume_id current_file_url match_score createdAt updatedAt") 
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        // Fetch user details
        const userIds = applications.map(app => app.user_id);
        const users = await User.find({ _id: { $in: userIds } }).select("-password -__v");

        // Map user and resume details to applications
        const applicationsWithDetails = applications.map(app => {
            const applicant = users.find(user => user._id.toString() === app.user_id.toString()) || null;

            return {
                ...app._doc,
                applicant_details: applicant
                    ? {
                        ...applicant._doc,
                        resume_url: app.current_file_url 
                    }
                    : null
            };
        });

        res.status(200).json({
            total_applications: totalApplications,
            current_page: parseInt(page),
            total_pages: Math.ceil(totalApplications / limit),
            job_details: job, // Return job details only once
            applications: applicationsWithDetails, // Applications with applicant details
        });

    } catch (error) {
        res.status(500).json({ message: "Error fetching applications", error: error.message });
    }
};


// withdraw application
const withdrawApplication = async (req, res) => {
    try {
        const user_id = req.user.user_id; // Extract user ID from authenticated user
        const { job_id } = req.query; // Get job_id from request params

        // Find the application
        const application = await Application.findOne({ job_id, user_id });

        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        // Delete the application (withdraw)
        await Application.deleteOne({ _id: application._id });

        res.status(200).json({ message: "Application withdrawn successfully" });

    } catch (error) {
        res.status(500).json({ message: "Error withdrawing application", error: error.message });
    }
};




exports = module.exports = { postApplication,getApplicationsByUser,getApplicationsForRecruiter,withdrawApplication };