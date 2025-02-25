const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Access Denied. No token provided." });
    }

    const token = authHeader.split(" ")[1]; // Extract token after "Bearer"
    
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET); // Verify token
        if (!verified || !verified.user_id) {
            return res.status(401).json({ message: "Invalid Token: User ID missing." });
        }

        req.user = { user_id: verified.user_id, role: verified.role  }; // Store user data in request
        console.log("Authenticated user:", req.user);

        next();
    } catch (err) {
        console.error("JWT Verification Error:", err.message);
        res.status(401).json({ message: "Invalid Token" });
    }
};

// Middleware to allow only recruiters
const authorizeRecruiter = (req, res, next) => {
    // console.log("User Role:", req.user.role);
    if (req.user.role !== 2) {
        return res.status(403).json({ message: "Access Denied. Only recruiters can perform this action." });
    }
    next();
};

module.exports = {authMiddleware,authorizeRecruiter};
