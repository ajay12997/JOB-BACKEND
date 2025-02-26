const express = require('express');
const {postApplication,getApplicationsByUser} = require('../controllers/application.controller');
const { authMiddleware, authorizeRecruiter } = require("../middleware/authMiddleware");
const router = express.Router();

router.post('/apply', authMiddleware, postApplication);
router.get('/userApplications', authMiddleware, getApplicationsByUser);


module.exports = router;