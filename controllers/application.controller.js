const Application = require('../models/Application');
const JobPost = require('../models/JobPost');


const postApplication = async (req, res) => {
    try {
        const { job_id } = req.params;
        const user_id = req.user.user_id; // Extracted from token

        // Check if the job exists
        const job = await JobPost.findById(job_id);
        if (!job) return res.status(404).json({ message: "Job not found" });

        // Prevent recruiters from applying
        if (req.user.role !== "jobseeker") {
            return res.status(403).json({ message: "Only job seekers can apply" });
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


const getApplicationsByUser = async (req, res) => {
    try {
        const { user_id } = req.params;

        // Ensure the user is accessing their own applications or is an admin
        if (req.user.user_id !== user_id && req.user.role !== "admin") {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        // Fetch applications with job details
        const applications = await Application.find({ user_id }).populate("job_id");

        res.status(200).json({ applications });
    } catch (error) {
        res.status(500).json({ message: "Error fetching applications", error: error.message });
    }
};


exports = module.exports = { postApplication,getApplicationsByUser };