const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "jobposts", required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId,ref: "users", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId,ref: "users", required: true },
  messages: [
    {
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
      message: { type: String, required: true }, // Ensure message is required inside array
      timestamp: { type: Date, default: Date.now }
    }
  ],
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Chat", chatSchema);
