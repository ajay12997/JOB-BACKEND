const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const resume = require("../models/resumes");
const crypto = require("crypto");
const {sendResetEmail, sendVerificationEmail}=require("../config/nodemailer");



// user register
const userRegistration = async (req, res) => {
    try {
        // console.log("Received Request Body:", req.body); 
        const { email, password, role,skills,education,aboutMe} = req.body;
        const organizationName = role === 2 ? req.body.organizationName:"";
        const name = role !== 2 ? req.body.name:"";

        // console.log("Organization Name:", organizationName);
        if (!email || !password) {
            return res.status(403).json({ message: "All fields are required." });
          }
        if (role === 2 && !organizationName) {
            return res.status(403).json({ message: "Organization name is required for recruiters." });
          }

        // Check if email already exists
        let existingUser = await User.findOne({ email });

        if (existingUser) {
            if (!existingUser.isVerified) {
                // Generate a new token if user is not verified
                const verificationToken = jwt.sign(
                    { userId: existingUser._id }, process.env.JWT_SECRET, { expiresIn: "1h" }
                );

                // Send new verification email

                const verificationLink = `${process.env.API_BASE_URL}/api/users/verifyEmail?token=${verificationToken}`;

                await sendVerificationEmail(email, verificationLink);

                return res.status(200).json({ 
                    message: "A new verification email has been sent. Please check your inbox." 
                });
            }
            return res.status(401).json({ message: "This email is already registered. Please log in." });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create New User
        const user = new User({ name, organizationName, email,skills,education,aboutMe, password: hashedPassword, role, isVerified: false});
        await user.save();
        

        // Remove password from response for security
        const { password: _, ...userData } = user.toObject();

         // Generate Verification Token
         const verificationToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });


         const verificationLink = `${process.env.API_BASE_URL}/api/users/verifyEmail?token=${verificationToken}`;

         
         await sendVerificationEmail(user.email, verificationLink);

         console.log("Verification Link:", verificationLink);

 
         return res.status(201).json({
             message: "User registered successfully. Please verify your email.",
             user: userData,
         });

        // return res.status(201).json({
        //     message: "User Registered Successfully",
        //     user: userData,
        // });

    } catch (err) {
        console.error("Error in userRegistration:", err);
        return res.status(500).json({ message: err.message });
    }
};

// verify email
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(400).json({ message: "Invalid token." });

        user.isVerified = true;
        await user.save();

        return res.status(200).json({
             message: "Email verified successfully. You can now log in.",


           });

         

    } catch (error) {
        console.error("Email Verification Error:", error);
        return res.status(400).json({ message: "Invalid or expired token." });
    }

};



// user login
const userLogin =async (req, res) => {
    try {
        const { email, password } = req.body;
        if(!email || !password)return res.status(401).json({ message: "Please enter credentials " });

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: "Invalid Credentials" });
        console.log("isVerified",user.isVerified);
        if (!user.isVerified) {
            return res.status(403).json({ message: "Please verify your email before logging in." });
        }

        // Compare Passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid Credentials",
            data: {
                name: user.name,
                role: user.role,
                email: user.email,
            }
         });

          // Fetch resume details
        const Resume = await resume.findOne({ user_id: user._id });
         console.log("Resume", Resume);
        // Generate Token
        const token = jwt.sign({ user_id: user._id, role: user.role }, process.env.JWT_SECRET);

         res.json({ message: "Login Successful", 
            data: {
            name: user.name,
            role: user.role,
            email: user.email,
            user_id: user._id,
            organizationName: user.organizationName,
            resumeUrl: Resume && Resume.current_file_url ? Resume.current_file_url :" ", 
            isUploaded:  Resume ? !!Resume.current_file_url : false,  
          },token });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// forgot password 
// Generate and send OTP
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "User not found" });

        const otp = crypto.randomInt(100000, 999999).toString(); // Generate 6-digit OTP
        user.resetOtp = otp;
        user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 min expiry

        await user.save();

        await sendResetEmail(email, `Your OTP for password reset is: ${otp}`);

        res.status(200).json({ message: "OTP sent to your email" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// Verify OTP 
const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const user = await User.findOne({ resetOtp: otp, resetOtpExpires: { $gt: Date.now() } });

        if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });

        // Generate temporary token (or flag in session)
        const tempToken = crypto.randomBytes(20).toString('hex'); 
        user.tempToken = tempToken;
        await user.save();

        res.status(200).json({ message: "OTP verified", tempToken });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



// reset password  
const resetPassword = async (req, res) => {
    try {
        const { tempToken, newPassword } = req.body;
        const user = await User.findOne({ tempToken });

        if (!user) return res.status(400).json({ message: "Invalid request. Please verify OTP again." });

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetOtp = undefined;
        user.resetOtpExpires = undefined;
        user.tempToken = undefined;

        await user.save();

        res.status(200).json({ message: "Password reset successful" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// get user by id
const getUser = async (req, res) => {
    try {
        const { user_id } = req.user; // Extracted from token
        if (!user_id) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const user = await User.findById(user_id).select("-password");
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};




module.exports = {userLogin,verifyEmail,userRegistration,forgotPassword,verifyOtp,resetPassword,getUser};