const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
   
    job_id: { type: String, ref: "jobposts", required: true },
    user_id: { type: String, ref: "users", required: true },
    match_score: { type: Number, default: 0.0 } // AI-calculated match score
}, { timestamps: true });

module.exports = mongoose.model("Application", applicationSchema);