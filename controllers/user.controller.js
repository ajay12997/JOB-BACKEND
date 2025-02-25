const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const {sendResetEmail, sendVerificationEmail}=require("../config/nodemailer");


// user register
const userRegistration = async (req, res) => {
    try {
        // console.log("Received Request Body:", req.body); 
        const { email, password, role} = req.body;
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
                const verificationLink = `http://localhost:5000/api/auth/verify-email?token=${verificationToken}`;
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
        const user = new User({ name, organizationName, email, password: hashedPassword, role, isVerified: false});
        await user.save();
        

        // Remove password from response for security
        const { password: _, ...userData } = user.toObject();

         // Generate Verification Token
         const verificationToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

         const verificationLink = `http://localhost:5000/api/auth/verify-email?token=${verificationToken}`;
         
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

        return res.status(200).json({ message: "Email verified successfully. You can now log in." });

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
        // if (!user.isVerified) {
        //     return res.status(403).json({ message: "Please verify your email before logging in." });
        // }

        // Compare Passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid Credentials",
            data: {
                name: user.name,
                role: user.role,
                email: user.email,
            }
         });

        // Generate Token
        const token = jwt.sign({ user_id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

         res.json({ message: "Login Successful", 
            data: {
            name: user.name,
            role: user.role,
            email: user.email,
            user_id: user._id,
            organizationName: user.organizationName 

          },token });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// forgot password 
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "User not found" });

        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetToken = resetToken;
        user.resetTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

        await user.save();

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        await sendResetEmail(email, resetLink);

        res.status(200).json({ message: "Password reset link sent to your email" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// reset password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const user = await User.findOne({ resetToken: token, resetTokenExpires: { $gt: Date.now() } });

        if (!user) return res.status(400).json({ message: "Invalid or expired token" });

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;

        await user.save();

        res.status(200).json({ message: "Password reset successful" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



module.exports = {userLogin,verifyEmail,userRegistration,forgotPassword,resetPassword};