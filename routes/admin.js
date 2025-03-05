const express = require("express");
const {getDashboardStats,getPostedJobsByMonth,getApplicationsByMonth} = require("../controllers/adminController");
const { authMiddleware } = require("../middleware/authMiddleware");


const router = express.Router();

router.get("/dashbord",getDashboardStats);
router.get("/postByMonth",getPostedJobsByMonth);
router.get("/applicationByMonth",getApplicationsByMonth);

module.exports = router;