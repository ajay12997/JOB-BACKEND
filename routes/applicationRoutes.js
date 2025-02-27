const express = require('express');
const {postApplication,getApplicationsByUser,getApplicationsForRecruiter} = require('../controllers/application.controller');
const { authMiddleware, authorizeRecruiter } = require("../middleware/authMiddleware");
const router = express.Router();

router.post('/apply', authMiddleware, postApplication);
router.get('/userApplications', authMiddleware, getApplicationsByUser);
router.get('/recruiter',authMiddleware,getApplicationsForRecruiter);


module.exports = router;