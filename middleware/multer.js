const multer = require("multer");

// Store file in memory as Buffer
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});
console.log(upload);
module.exports = upload;
