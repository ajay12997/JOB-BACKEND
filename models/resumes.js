const mongoose = require("mongoose");


const ResumeSchema = new mongoose.Schema(
    {
        
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Foreign key reference to users
        current_file_url: { type: String, required: true }, // Path to stored resume
        previous_file_url: { type: String,},
        parsed_data: { type: Object, default: {} }, // JSON with extracted data (skills, education, etc.)
    },
    { timestamps: true } 
);

module.exports = mongoose.model("resume", ResumeSchema);
