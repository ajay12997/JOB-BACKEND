const express = require("express");
const User = require("../models/user");
const {userRegistration,verifyEmail,userLogin,forgotPassword,resetPassword} = require("../controllers/user.controller");
const router = express.Router();

// REGISTER USER
router.post("/register" , userRegistration);

// LOGIN USER
router.post("/login", userLogin);

// forgot password
router.post("/forgotPass",forgotPassword);

// reset password
router.post("/resetPass", resetPassword);

// verify email
router.get("/verify-email", verifyEmail);


// GET ALL USERS (Protected)
router.get("/getUsers", async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.messag});
    }
});

module.exports = router;
