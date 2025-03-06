const s3 = require("../config/awsConfig");
const Resume = require("../models/resumes");
const Application = require("../models/Application");
const axios = require("axios");


const uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const userId = req.user.user_id;
    const file = req.file;
    const fileKey = `resumes/${Date.now()}-${file.originalname}`;

    // Upload file to S3
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    const fileUrl = uploadResult.Location;

    // Store file URL in MongoDB
    const newResume = new Resume({ user_id: userId, current_file_url: fileUrl });
    await newResume.save();

    // Send success response
    res.status(201).json({
      message: "File uploaded successfully",
      current_file_url: fileUrl,
      resume_id: newResume._id.toString(),
      previous_file_url:" ",
    });

    // Trigger AI model API
    const aiApiUrl = `${process.env.AI_BASE_URL}/process_resume?resume_id=${newResume._id}&user_id=${userId}`;

    axios.get(aiApiUrl)
      .then(response => console.log("AI processing response:", response.data))
      .catch(error => console.error("Error calling external API:", error.message));

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Server error", error: error.message || error });
  }
};




// get resumes 
const getResume = async (req, res) => {
  try {
    const { user_id } = req.user;
    
    // Find resume from MongoDB
    const resume = await Resume.findOne({ user_id });
    console.log("Resume Query Result:", resume);
    
    if (!resume.current_file_url) {
      return res.status(404).json({ message: "No Current Resume Available" });
    }

    res.status(200).json({ file_url: resume.current_file_url });
  } catch (error) {
    console.error("Error fetching resume:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// GET All Resumes API
const getAllResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({}, "_id user_id current_file_url"); // Fetch all resumes with user_id and file_url

    if (resumes.length === 0) {
      return res.status(404).json({ message: "No resumes found" });
    }

    res.status(200).json({ resumes });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// delete API
const deleteResume = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Find the resume in MongoDB
    const resume = await Resume.findOne({ user_id: userId });
    if (!resume) {
      return res.status(404).json({ message: "No resume found for this user" });
    }

    // Delete the resume record from MongoDB (but keep the file in S3)
    await Resume.deleteMany({ user_id: userId });

    res.status(200).json({ message: "Resume deleted successfully from the database" });

  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Server error", error: error.message || error });
  }
};



module.exports = { uploadResume, getResume, getAllResumes, deleteResume };
