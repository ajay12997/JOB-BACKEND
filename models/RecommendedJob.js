const mongoose = require("mongoose");

const RecommendedJobSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  resume_id: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: true },
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  recommended_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("RecommendedJob", RecommendedJobSchema);
