const mongoose = require("mongoose");


const ResumeSchema = new mongoose.Schema(
    {
       
        user_id: { type: String, ref: "users", required: true }, // Foreign key reference to users
        current_file_url: { type: String, required: true },
        previous_file_url: { type: String,}, // Path to stored resume
        parsed_data: { type: Object, default: {} }, // JSON with extracted data (skills, education, etc.)
    },
    { timestamps: true } 
);

const Resume = mongoose.model("Resume", ResumeSchema);
module.exports= Resume