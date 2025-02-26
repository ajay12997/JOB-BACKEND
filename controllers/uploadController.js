const s3 = require("../config/awsConfig");
const Resume = require("../models/resumes");

const uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const userId =  req.user.user_id;
    const file = req.file;
    const fileKey = `resumes/${Date.now()}-${file.originalname}`;

    // Upload file directly to S3
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    const fileUrl = uploadResult.Location;

    // Store file URL in MongoDB
    const newResume = new Resume({ user_id: userId, file_url: fileUrl });
    await newResume.save();

    res.status(201).json({ message: "File uploaded successfully", fileUrl });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const getResume = async (req, res) => {
  try {
      const { user_id } = req.params;

      // Find resume from MongoDB
      const resume = await Resume.findOne({ user_id });

      if (!resume) {
          return res.status(404).json({ message: "Resume not found" });
      }

      res.status(200).json({ file_url: resume.file_url });
  } catch (error) {
      res.status(500).json({ message: "Server Error", error: error.message });
  }
};
// GET All Resumes API
const getAllResumes = async (req, res) => {
  try {
      const resumes = await Resume.find({}, "user_id file_url"); // Fetch all resumes with user_id and file_url

      if (resumes.length === 0) {
          return res.status(404).json({ message: "No resumes found" });
      }

      res.status(200).json({ resumes });
  } catch (error) {
      res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const deleteResume = async (req, res) => {
  try {
      const { user_id } = req.params;

      // Find resume in MongoDB
      const resume = await Resume.findOne({ user_id });

      if (!resume) {
          return res.status(404).json({ message: "Resume not found" });
      }

      // Extract S3 file key from URL
      try {
          const urlParts = new URL(resume.file_url);
          const fileKey = decodeURIComponent(urlParts.pathname.substring(1)); // Remove leading '/'
      
          // Delete from S3
          await s3.deleteObject({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: fileKey,
          }).promise();

      } catch (s3Error) {
          return res.status(500).json({ message: "Error deleting file from S3", error: s3Error.message });
      }

      // Delete from MongoDB only if S3 deletion was successful
      await Resume.deleteOne({ user_id });

      res.status(200).json({ message: "Resume deleted successfully" });

  } catch (error) {
      res.status(500).json({ message: "Server Error", error: error.message });
  }
};
module.exports = {uploadResume, getResume,getAllResumes,deleteResume} ;
