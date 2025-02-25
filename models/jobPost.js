const mongoose = require("mongoose");
// const AutoIncrement = require("mongoose-sequence")(mongoose);

const JobPostSchema = new mongoose.Schema(
    {
       
        recruiter_id: { 
            type: mongoose.Schema.Types.ObjectId, 
            required: true, 
            ref: "users"  
        },
        recruiter_name: { type: String, required: true },

        job_title: { type: String, required: true },
        description: { type: String, required: true },
        
        company_name: { type: String, required: true },
        company_details: { type: String, required: true },

        employee_role: { 
            type: String, 
            enum: ["Intern", "Full-time", "Freelancer", "Part-time"], 
            required: true 
        },

        location: { type: String, required: true },
        skills: { type: [String], required: true }, 

        salary_range: { 
            type: {
                min: { type: Number, required: true }, 
                max: { type: Number, required: true },
                currency: { type: String, required: true, default: "LPA" }
            }, 
            required: true 
        },


        job_type: { 
            type: String, 
            required: true, 
            enum: ["Remote", "On-site", "Hybrid"] 
        },

        vacancy: { type: Number, default: 1 },

        qualification: { type: String, required: true },

        posted_date: { type: Date, default: Date.now },
        expire_date: { type: Date },

        responsibility: { type: String, required: true },
        experience: { 
            type: String,
            match: /^\d+(\s*-\s*\d+|\+)?\s*years$/, 
            required: true 
        }
    },
    { timestamps: true }
);

// Auto-increment job_id
// JobPostSchema.plugin(AutoIncrement, { inc_field: "job_id" });

module.exports = mongoose.model("JobPost", JobPostSchema);
