const Chat = require("../models/chat");
const Application = require("../models/Application");
const JobPost = require("../models/jobPost");
const User = require("../models/user");

 

//Get Messages for a Job Chat
const getMessages = async (req, res) => {
  try {
    const { room } = req.query; // Get room ID from URL

    // Retrieve messages for the given room
    const chat = await Chat.findOne({ room });

    if (!chat) {
      return res.status(200).json({ message: "No previous messages found", messages: [] });
    }

    res.status(200).json({ messages: chat.messages });

  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// get available chat options
const getChatOptions = async (req, res) => {
  try {
      const user_id = req.user.user_id; // Logged-in user ID
      const user_role = req.user.role; // User role (2: Recruiter, 3: Candidate)
      const searchQuery = req.query.search?.trim(); // Get search query from request

      let chatOptions = [];

      if (user_role === 3) {
          // If user is a Candidate, fetch recruiters they have applied to
          const applications = await Application.find({ user_id }).select("job_id");
          const jobIds = applications.map(app => app.job_id);

          const query = { _id: { $in: jobIds } };
          if (searchQuery) {
              query.recruiter_name = { $regex: searchQuery, $options: "i" }; // Case-insensitive search
          }

          const jobs = await JobPost.find(query).select("recruiter_id recruiter_name job_title");

          // Remove duplicate recruiters
          const uniqueRecruiters = new Map();
          jobs.forEach(job => {
              uniqueRecruiters.set(job.recruiter_id.toString(), { id: job.recruiter_id, name: job.recruiter_name });
          });

          chatOptions = Array.from(uniqueRecruiters.values());

      } else if (user_role === 2) {
          // If user is a Recruiter, fetch candidates who applied to their jobs
          const jobs = await JobPost.find({ recruiter_id: user_id }).select("_id");
          const jobIds = jobs.map(job => job._id);

          const applications = await Application.find({ job_id: { $in: jobIds } }).select("user_id");
          const userIds = applications.map(app => app.user_id);

          const query = { _id: { $in: userIds } };
          if (searchQuery) {
              query.name = { $regex: searchQuery, $options: "i" }; // Case-insensitive search
          }

          const candidates = await User.find(query).select("_id name email");

          // Remove duplicate candidates
          const uniqueCandidates = new Map();
          candidates.forEach(candidate => {
              uniqueCandidates.set(candidate._id.toString(), { id: candidate._id, name: candidate.name });
          });

          chatOptions = Array.from(uniqueCandidates.values());
      }

      res.status(200).json({ chatOptions });

  } catch (error) {
      res.status(500).json({ message: "Error fetching chat options", error: error.message });
  }
};




module.exports = {  getMessages, getChatOptions };
