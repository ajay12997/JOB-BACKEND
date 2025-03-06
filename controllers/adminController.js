const JobPost = require("../models/jobPost");
const Application = require('../models/Application');
const User = require("../models/user");
const resume = require("../models/resumes");

const getDashboardStats = async (req, res) => {
    try {
        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of the day

          // Get the date 7 days ago
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(today.getDate() - 7);
          sevenDaysAgo.setHours(0, 0, 0, 0); // Normalize to start of the day

        // Fetch total jobs and active jobs
        const [totalJobs, activeJobs] = await Promise.all([
            JobPost.countDocuments(), // Count total jobs
            JobPost.countDocuments({ expire_date: { $gte: today } }) // Count active jobs (expire_date >= today)
        ]);

        // Fetch total candidates and recruiters
        const [totalCandidates, totalRecruiters] = await Promise.all([
            User.countDocuments({ role: 3 }), // Count candidates
            User.countDocuments({ role: 2 })  // Count recruiters
        ]);

        const [totalApplications,ApplicationsLast7Days] = await Promise.all([
            Application.countDocuments(),
            Application.countDocuments({
            createdAt: { $gte: sevenDaysAgo, $lte: today }})
       ]);
       // Fetch the 5 most recent job posts
       const recentJobs = await JobPost.find({}, { job_title: 1, company_name: 1, location: 1, expire_date: 1 })
       .sort({ posted_date: -1 }) // Sort by most recent
       .limit(5) // Get only the latest 5 jobs
       .lean(); 

         // Add job status (active or expired)
         const formattedRecentJobs = recentJobs.map(job => ({
            job_title: job.job_title,
            company_name: job.company_name,
            location: job.location,
            status: job.expire_date >= today ? "Active" : "Expired"
        }));
        // Fetch the 5 most recent job applications with user details
        const recentApplications = await Application.find({})
            .sort({ createdAt: -1 }) // Sort by most recent applications
            .limit(5) // Get only the latest 5 applications
            .populate("user_id", "name education") // Populate username and education from User collection
            .lean();

        // Format job applications data
        const formattedRecentApplications = recentApplications.map(application => ({
            username: application.user_id?.name || "Unknown",
            education: application.user_id?.education || "Not Provided"
        }));


        // Send response
        res.status(200).json({
            totalJobs,
            activeJobs,
            totalCandidates,
            totalRecruiters,
            ApplicationsLast7Days,
            totalApplications,
            recentJobs: formattedRecentJobs,
            recentApplications: formattedRecentApplications
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ message: "Error fetching dashboard stats", error: error.message });
    }
};

const getPostedJobsByMonth = async (req, res) => {
    try {
        const { year } = req.query; // Get year from request params
        if (!year) {
            return res.status(400).json({ message: "Year is required" });
        }

        // Convert year to integer
        const selectedYear = parseInt(year);

        // Define months for reference
        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        // Aggregate query to count jobs by month
        const jobsByMonth = await JobPost.aggregate([
            {
                $match: {
                    
        posted_date: {
                        $gte: new Date(`${selectedYear}-01-01T00:00:00.000Z`),
                        $lte: new Date(`${selectedYear}-12-31T23:59:59.999Z`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$posted_date" }, // Group by month number
                    jobs: { $sum: 1 } // Count jobs per month
                }
            },
            { $sort: { "_id": 1 } } // Sort by month number (Jan to Dec)
        ]);

        // Map results to the desired format
        const jobsByMonthFormatted = months.map((month, index) => {
            const data = jobsByMonth.find(j => j._id === index + 1);
            return { month, jobs: data ? data.jobs : 0 };
        });

        res.status(200).json({ jobsByMonth: jobsByMonthFormatted });

    } catch (error) {
        res.status(500).json({ message: "Error fetching jobs by month", error: error.message });
    }
};
const getApplicationsByMonth = async (req, res) => {
    try {
        const { year } = req.query; // Get year from request params
        if (!year) {
            return res.status(400).json({ message: "Year is required" });
        }

        // Convert year to integer
        const selectedYear = parseInt(year);

        // Define months for reference
        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        // Aggregate query to count applications by month
        const applicationsByMonth = await Application.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(`${selectedYear}-01-01T00:00:00.000Z`),
                        $lte: new Date(`${selectedYear}-12-31T23:59:59.999Z`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" }, // Group by month number
                    applications: { $sum: 1 } // Count applications per month
                }
            },
            { $sort: { "_id": 1 } } // Sort by month number (Jan to Dec)
        ]);

        // Map results to the desired format
        const applicationsByMonthFormatted = months.map((month, index) => {
            const data = applicationsByMonth.find(a => a._id === index + 1);
            return { month, applications: data ? data.applications : 0 };
        });

        res.status(200).json({ applicationsByMonth: applicationsByMonthFormatted });

    } catch (error) {
        res.status(500).json({ message: "Error fetching applications by month", error: error.message });
    }
};


module.exports = {getDashboardStats,getPostedJobsByMonth,getApplicationsByMonth};