const express = require('express');
const {postApplication,getApplicationsByUser,getApplicationsForRecruiter,withdrawApplication} = require('../controllers/application.controller');
const { authMiddleware, authorizeRecruiter } = require("../middleware/authMiddleware");
const router = express.Router();

router.post('/apply', authMiddleware, postApplication);
router.get('/userApplications', authMiddleware, getApplicationsByUser);
router.get('/recruiter',authMiddleware,getApplicationsForRecruiter);
router.delete('/delete', authMiddleware, withdrawApplication);


module.exports = router;