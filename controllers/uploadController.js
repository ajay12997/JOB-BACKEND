const s3 = require("../config/awsConfig");
const Resume = require("../models/resumes");
const Application = require("../models/Application");
const axios = require("axios");

// Upload Resume
const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Validate user_id from req.user
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: "Unauthorized: Missing user data" });
    }

    const userId = req.user.user_id;

    const file = req.file;
    const newFileKey = `resumes/${Date.now()}-${file.originalname}`;

    // Check if the user already has a resume
    const existingResume = await Resume.findOne({ user_id: userId });
    let previousFileUrl = null;

    if (existingResume && existingResume.current_file_url) {
      try {
        // Extract file key safely
        const oldFileKey = existingResume.current_file_url.split(".com/")[1];

        if (!oldFileKey) {
          console.warn("Old file key extraction failed:", existingResume.current_file_url);
        } else {
          console.log("Old file key:", oldFileKey);

          // Check if resume was used in any application
          const resumeUsed = await Application.exists({ user_id: userId });

          if (resumeUsed) {
            // Move old resume to "history" folder in S3
            const historyFileKey = `history/${oldFileKey.split("/").pop()}`;

            await s3.copyObject({
              Bucket: process.env.AWS_BUCKET_NAME,
              CopySource: `${process.env.AWS_BUCKET_NAME}/${oldFileKey}`,
              Key: historyFileKey,
            }).promise();

            previousFileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${historyFileKey}`;
          }

          // Delete the old resume from "resumes" folder (ignore if it doesn't exist)
          await s3
            .deleteObject({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: oldFileKey,
            })
            .promise()
            .catch((err) => {
              if (err.code !== "NoSuchKey") {
                console.error("Error deleting old file:", err);
              }
            });
        }
      } catch (err) {
        console.error("Error handling existing resume:", err);
      }
    }

    // Upload new resume to S3
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: newFileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    const newFileUrl = uploadResult.Location;

    let resumeId;
    let newResume = " ";

    if (existingResume) {
      await Resume.updateOne(
        { _id: existingResume._id },
        {
          user_id: userId,
          current_file_url: newFileUrl,
          previous_file_url: previousFileUrl || " ",
        }
      );
      
      resumeId = existingResume._id;
    } else {
      newResume = await new Resume({
        user_id: userId,
        current_file_url: newFileUrl,
        previous_file_url: " ",
      }).save();

      resumeId = newResume._id;
    }

    // Call external API after uploading resume
    const aiApiUrl = `http://54.157.16.230/process_resume?resume_id=${resumeId}&user_id=${userId}`;
    try {
       const response = await axios.get(aiApiUrl);
       console.log("ai data",response.data);
      console.log("Successfully called external API");
    } catch (error) {
      console.error("Error calling external API:", error.message);
    }

    res.status(201).json({
      message: "Resume uploaded successfully",
      current_file_url: newFileUrl,
      resume_id: resumeId.toString(),
      previous_file_url: previousFileUrl || "No previous resume found",
    });
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
    const { user_id } = req.user;

    // Find resume in MongoDB
    const resume = await Resume.findOne({ user_id });

    if (!resume || !resume.current_file_url) {
      return res.status(404).json({ message: "Resume not found in the database" });
    }

    // Extract the file key from S3 URL
    const fileUrl = resume.current_file_url;
    const bucketName = process.env.AWS_BUCKET_NAME;
    const fileKey = fileUrl.split(`${bucketName}.s3.`)[1].split(".amazonaws.com/")[1];

    if (!fileKey) {
      return res.status(400).json({ message: "Could not extract file key from URL" });
    }

    await s3.deleteObject({
      Bucket: bucketName,
      Key: fileKey,
    }).promise();

    await Resume.deleteOne({ user_id });

    res.status(200).json({ message: "Resume deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = { uploadResume, getResume, getAllResumes, deleteResume };
