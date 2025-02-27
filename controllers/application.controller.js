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
        console.log("id",job_id)
        // Check if the job exists
        const job = await JobPost.findById(job_id);
        console.log("job",job);
        if (!job) return res.status(404).json({ message: "Job not found" });

        // Prevent recruiters from applying
        if (req.user.role !== 3) {
            return res.status(403).json({ message: "Only job seekers can apply" });
        }

        // Check if the user has uploaded a resume
        const userResume = await resume.findOne({ user_id });
        if (!userResume) {
            return res.status(400).json({ message: "You must upload a resume before applying" });
        }

        // Prevent duplicate applications
        const existingApplication = await Application.findOne({ job_id, user_id });
        if (existingApplication) {
            return res.status(400).json({ message: "You have already applied for this job" });
        }

        // Create new application
        const application = new Application({ job_id, user_id });
        await application.save();

        res.status(201).json({ message: "Application submitted successfully", application });
    } catch (error) {
        res.status(500).json({ message: "Error applying for job", error: error.message });
    }
};

// fetch applications by user 
const getApplicationsByUser = async (req, res) => {
    try {
        const user_id  = req.user.user_id;

        // Ensure the user is accessing their own applications or is an admin
        if (req.user.user_id !== user_id && req.user.role !== "admin") {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        console.log("user_id", user_id);

        // Fetch applications
        const applications = await Application.find({ user_id });

        if (applications.length === 0) {
            return res.status(404).json({ message: "No applications found" });
        }

        // Fetch job details separately
        const jobIds = applications.map(app => app.job_id);
        const jobs = await JobPost.find({ _id: { $in: jobIds } });

        // Map job details to applications
        const applicationsWithJobs = applications.map(app => ({
            ...app._doc,
            job_details: jobs.find(job => job._id.toString() === app.job_id) || null
        }));

        console.log("applicationsWithJobs", applicationsWithJobs);

        res.status(200).json({ applications: applicationsWithJobs });
    } catch (error) {
        res.status(500).json({ message: "Error fetching applications", error: error.message });
    }
};

// fetch Applied Candidates for Recruiter's Jobs
const getApplicationsForRecruiter = async (req, res) => {
    try {
        const recruiter_id = req.user.user_id; // Extract recruiter ID from token
        console.log("recruiter_id", recruiter_id);
        // Ensure only recruiters can access this API
        if (req.user.role !== 2) {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        // Find jobs posted by this recruiter
        const jobs = await JobPost.find({ recruiter_id });
        if (!jobs.length) {
            return res.status(404).json({ message: "No jobs found for this recruiter" });
        }

        // Extract job IDs
        const jobIds = jobs.map(job => job._id.toString());

        // Fetch applications for these jobs
        const applications = await Application.find({ job_id: { $in: jobIds } });

        if (!applications.length) {
            return res.status(404).json({ message: "No applications found for your jobs" });
        }

        // Fetch user details for each applicant
        const userIds = applications.map(app => app.user_id);
        const users = await User.find({ _id: { $in: userIds } });

        // Fetch job details
        const jobsMap = {};
        jobs.forEach(job => {
            jobsMap[job._id.toString()] = job;
        });

        // Format response data
        const applicationsWithDetails = applications.map(app => ({
            ...app._doc,
            job_details: jobsMap[app.job_id] || null,
            applicant_details: users.find(user => user._id.toString() === app.user_id) || null
        }));

        res.status(200).json({ applications: applicationsWithDetails });

    } catch (error) {
        res.status(500).json({ message: "Error fetching applications", error: error.message });
    }
};




exports = module.exports = { postApplication,getApplicationsByUser,getApplicationsForRecruiter };