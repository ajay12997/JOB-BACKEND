const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendResetEmail = async (email, resetLink) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset Request",
            html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link is valid for 15 minutes.</p>`
        };

        await transporter.sendMail(mailOptions);
        console.log("Reset Email Sent to:", email);
    } catch (error) {
        console.error("Error Sending Reset Email:", error);
    }
};

const sendVerificationEmail = async (email, verificationLink) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Email Verification",
            html: `<p>Click <a href="${verificationLink}">here</a> to verify your email. This link is valid for 1 hour.</p>`
        };

        await transporter.sendMail(mailOptions);
        console.log("Verification Email Sent to:", email);
    } catch (error) {
        console.error("Error Sending Verification Email:", error);
    }
};


module.exports = {sendResetEmail,sendVerificationEmail};
