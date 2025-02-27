const s3 = require("../config/awsConfig");
const Resume = require("../models/resumes");
const Application = require("../models/Application");

// upload resume
const uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

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
              Key: historyFileKey
            }).promise();

            previousFileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${historyFileKey}`;
          }

          // Delete the old resume from "resumes" folder (ignore if it doesn't exist)
          await s3.deleteObject({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: oldFileKey
          }).promise().catch((err) => {
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

    // Update or create a resume record
    const updatedResumeData = {
      user_id: userId,
      current_file_url: newFileUrl,
      previous_file_url: previousFileUrl || "", // Empty if no previous file exists
    };

    if (existingResume) {
      await Resume.updateOne({ _id: existingResume._id }, updatedResumeData);
    } else {
      await new Resume(updatedResumeData).save();
    }

    res.status(201).json({
      message: "Resume uploaded successfully",
      current_file_url: newFileUrl,
      resume_id: existingResume._id.toString(),
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

      if (!resume) {
          return res.status(404).json({ message: "Resume not found" });
      }

      res.status(200).json({ file_url: resume.current_file_url });
  } catch (error) {
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
    const { user_id } = req.user;  // Fixed user_id extraction

    // Find resume in MongoDB
    const resume = await Resume.findOne({ user_id });

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    // Extract the file key from S3 URL safely
    const fileUrl = resume.current_file_url; // ✅ Fix: Use the retrieved resume document

    if (!fileUrl || !fileUrl.includes(".amazonaws.com/")) {
      return res.status(400).json({ message: "Invalid file URL format" });
    }

    const fileKey = fileUrl.split(".amazonaws.com/")[1]; // Extract actual S3 key

    if (!fileKey) {
      return res.status(400).json({ message: "Could not extract file key from URL" });
    }

    // Check if the resume was used in any job application
    const resumeUsed = await Application.exists({ user_id });

    if (resumeUsed) {
      // Move resume to history folder instead of deleting
      const historyFileKey = `history/${fileKey.split("/").pop()}`;

      await s3.copyObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        CopySource: `${process.env.AWS_BUCKET_NAME}/${fileKey}`,
        Key: historyFileKey,
      }).promise();

      // Update database with history file URL
      const historyFileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${historyFileKey}`;
      await Resume.updateOne({ user_id }, { previous_file_url: historyFileUrl });

      // Delete resume from "resumes" folder
      await s3.deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey,
      }).promise();

      return res.status(200).json({
        message: "Resume moved to history folder",
        previous_file_url: historyFileUrl,
      });
    }

    // If not applied, delete from S3
    await s3.deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
    }).promise();

    // Delete from MongoDB
    await Resume.deleteOne({ user_id });

    res.status(200).json({ message: "Resume deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


module.exports = {uploadResume, getResume,getAllResumes,deleteResume} ;
