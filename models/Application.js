const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
   
    job_id: { type: String, ref: "JobPost", required: true },
    user_id: { type: String, ref: "User", required: true },
<<<<<<< HEAD
    resume_id: { type: String, ref: "resume", required: true },
    current_file_url:{type:String, ref:"resume",required:true},
=======
    resume_id: { type: String, ref: "Resume", required: true },
    current_file_url: { type: String, ref: "Resume", required: true },
>>>>>>> origin
    match_score: { type: Number, default: 0.0 } // AI-calculated match score
}, { timestamps: true });

module.exports = mongoose.model("Application", applicationSchema);