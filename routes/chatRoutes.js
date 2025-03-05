const express = require("express");
const { getMessages, getChatOptions } = require("../controllers/chatController");
const { authMiddleware } = require("../middleware/authMiddleware");


const router = express.Router();


router.get("/messages", getMessages);
router.get("/options", authMiddleware, getChatOptions);


module.exports = router;
