const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    // user_id: { type: String, default: uuidv4, unique: true },
    name: { type: String },
    organizationName: { type: String},
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {  type: Number, 
        enum: [1, 2, 3], // 1: Admin, 2: Recruiter, 3: Candidate
        default: 3, required: true  },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    isVerified:{type:Boolean,default:false},
    verificationToken: { type: String }
}, { timestamps: true });


// validator for organizationName which is required for role 2 and name required for other roles
UserSchema.pre("save", function (next) {
    if (this.role === 2 && !this.organizationName) {
        return next(new Error(" Organization name is required for recruiters"));    
    }
    if(this.role !==2 && !this.name){
        return next(new Error("Name is required for candidates"));    
    }
    next();
})

module.exports = mongoose.model("User", UserSchema);
