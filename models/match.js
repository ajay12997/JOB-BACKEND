const mongoose = require("mongoose");

const MatchSchema = new mongoose.Schema({
  user_id: { type:String, ref: "users", required: true },
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: "jobposts", required: true },
  resume_id: { type: mongoose.Schema.Types.ObjectId, ref: "resumes", required: true },
  score: { type: Number, required: true , default: 0.0}, // AI match score
});

module.exports = mongoose.model("matches", MatchSchema);
