const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  room: { type: String, required: true, unique: true },  // Room ID (sender_receiver pair)
  messages: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // Auto-generated MongoDB ID
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true }, // Sender ID
      content: { type: String, required: true }, // Message text
      sender: { type: String, required: true }, // Socket ID of sender
      timestamp: { type: Date, default: Date.now } // Timestamp
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Chat", chatSchema);
