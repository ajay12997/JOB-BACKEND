const Chat = require("../models/chat");
const Application = require("../models/Application");
const JobPost = require("../models/jobPost");

// ✅Send Message
const sendMessage = async (req, res) => {
    try {
      const { jobId, senderId, receiverId, message } = req.body;
  
      if (!message) {
        return res.status(400).json({ message: "Message content is required" });
      }
  
      // 🔹 Validate job existence
      const job = await JobPost.findById(jobId);
      if (!job) return res.status(404).json({ message: "Job not found" });
  
      // 🔹 Check if sender is a recruiter or applied candidate
      const isRecruiter = job.recruiter_id.toString() === senderId;
      const isAppliedCandidate = await Application.exists({ job_id: jobId, user_id: senderId });
  
      if (!isRecruiter && !isAppliedCandidate) {
        return res.status(403).json({ message: "Unauthorized: Only applied candidates or recruiters can chat" });
      }
  
      // 🔹 Find existing chat or create a new one
      let chat = await Chat.findOne({ jobId, senderId, receiverId });
  
      if (!chat) {
        chat = new Chat({ jobId, senderId, receiverId, messages: [] });
      }
  
      // 🔹 Ensure messages array exists before pushing
      if (!Array.isArray(chat.messages)) {
        chat.messages = [];
      }
  
      // 🔹 Add new message
      chat.messages.push({ senderId, message });
  
      await chat.save();
  
      res.status(201).json({ message: "Message sent successfully", chat });
  
    } catch (error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  };
  


// ✅ Get Messages for a Job Chat
const getMessages = async (req, res) => {
  try {
    const { jobId, userId, receiverId } = req.params;

    // 🔹 Validate job existence
    const job = await JobPost.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    // 🔹 Check if user is a recruiter or applied candidate
    const isRecruiter = job.recruiter_id.toString() === userId;
    const isAppliedCandidate = await Application.exists({ job_id: jobId, user_id: userId });

    if (!isRecruiter && !isAppliedCandidate) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // 🔹 Retrieve chat messages
    const chat = await Chat.findOne({ jobId, senderId: userId, receiverId });

    if (!chat) {
      return res.status(200).json({ message: "No previous messages found", messages: [] });
    }

    res.status(200).json({ messages: chat.messages });

  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = { sendMessage, getMessages };
