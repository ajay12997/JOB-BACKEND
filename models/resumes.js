const mongoose = require("mongoose");


const ResumeSchema = new mongoose.Schema(
    {
       
        user_id: { type: String, ref: "users", required: true }, // Foreign key reference to users
        current_file_url: { type: String, required: true },
        previous_file_url: { type: String,}, // Path to stored resume
      
    },
    { timestamps: true } 
);

module.exports = mongoose.model("resume", ResumeSchema);
