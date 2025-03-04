// const s3 = require("../config/awsConfig");
// const Resume = require("../models/resumes");
// const Application = require("../models/Application");
// const RecommendedJob = require("../models/RecommendedJob");
// const axios = require("axios");

// // upload resume
// const uploadResume = async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ message: "No file uploaded" });

//     const userId = req.user.user_id;
//     const file = req.file;
//     const newFileKey = `resumes/${Date.now()}-${file.originalname}`;

//     // Check if the user already has a resume
//     const existingResume = await Resume.findOne({ user_id: userId });

//     let previousFileUrl = null;

//     if (existingResume && existingResume.current_file_url) {
//       try {
//         // Extract file key safely
//         const oldFileKey = existingResume.current_file_url.split(".com/")[1];

//         if (!oldFileKey) {
//           console.warn("Old file key extraction failed:", existingResume.current_file_url);
//         } else {
//           console.log("Old file key:", oldFileKey);

//           // Check if resume was used in any application
//           const resumeUsed = await Application.exists({ user_id: userId });

//           if (resumeUsed) {
//             // Move old resume to "history" folder in S3
//             const historyFileKey = `history/${oldFileKey.split("/").pop()}`;

//             await s3.copyObject({
//               Bucket: process.env.AWS_BUCKET_NAME,
//               CopySource: `${process.env.AWS_BUCKET_NAME}/${oldFileKey}`,
//               Key: historyFileKey
//             }).promise();

//             previousFileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${historyFileKey}`;
//           }

//           // Delete the old resume from "resumes" folder (ignore if it doesn't exist)
//           await s3.deleteObject({
//             Bucket: process.env.AWS_BUCKET_NAME,
//             Key: oldFileKey
//           }).promise().catch((err) => {
//             if (err.code !== "NoSuchKey") {
//               console.error("Error deleting old file:", err);
//             }
//           });
//         }
//       } catch (err) {
//         console.error("Error handling existing resume:", err);
//       }
//     }

//     // Upload new resume to S3
//     const uploadParams = {
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: newFileKey,
//       Body: file.buffer,
//       ContentType: file.mimetype,
//     };

//     const uploadResult = await s3.upload(uploadParams).promise();
//     const newFileUrl = uploadResult.Location;

//     // Update or create a resume record
//     let resumeId;
//     // const updatedResumeData = {
//     //   user_id: userId,
//     //   current_file_url: newFileUrl,
//     //   previous_file_url: previousFileUrl || "", // Empty if no previous file exists
//     // };

//     if (existingResume) {
//      await Resume.updateOne(
//       {_id:existingResume._id},
//       {
//         current_file_url:newFileUrl,
//         previous_file_url:previousFileUrl || " ",
//       }
//      );
//      resumeId = existingResume._id;
//     } else {
//       const newResume = await new Resume({
//         user_id:userId,
//         current_file_url:newFileUrl,
//         previous_file_url: " ",
//       }).save();
//       resumeId = newResume._id;
//     }
//     console.log("Resume saved with ID:", resumeId);

//     // Api for the job recommendation

//     const aiApiUrl = "http://44.202.97.91:8000/process_resume";
//     let aiResponse;
    
//     try {
//         aiResponse = await axios.post(aiApiUrl, {
//             userId,
//             resumeId: resumeId.toString(),
//         });
    
//         if (aiResponse?.data?.recommendations) {
//             console.log("AI recommendation", aiResponse.data.recommendations);
//             await saveRecommendationsToDB(userId, resumeId, aiResponse.data.recommendations);
//         } else {
//             console.warn("No recommendations received from AI API.");
//         }
//     } catch (err) {
//         console.error(`Error calling AI API: ${err.message} (Status: ${err.response?.status})`);
//         return res.status(500).json({ message: "AI API request failed", error: err.message });
//     }
    
   
//     res.status(201).json({
//       message: "Resume uploaded successfully",
//       current_file_url: newFileUrl,
//       resume_id: resumeId.toString(),
//       previous_file_url: previousFileUrl || "No previous resume found",
//       recommendations: aiResponse.data.recommendations || [],
//     });

//   } catch (error) {
//     console.error("Upload error:", error);
//     res.status(500).json({ message: "Server error", error: error.message || error });
//   }
// };
// // Function to save recommendation job in mongo
// async function saveRecommendationsToDB(userId, resumeId, recommendations) {
//   try {
//     await RecommendedJob.deleteMany({ user_id: userId }); // Clear previous recommendations

//     const recommendedJobs = recommendations.map((jobId) => ({
//       user_id: userId,
//       resume_id: resumeId,
//       job_id: jobId,
//     }));

//     await RecommendedJob.insertMany(recommendedJobs);
//     console.log("Recommendations saved to DB");
//   } catch (error) {
//     console.error("Error saving recommendations:", error);
//   }
// }


// // get resumes 
// const getResume = async (req, res) => {
//   try {
//       const { user_id } = req.user;
// console.log("user id:",user_id);
//       // Find resume from MongoDB
//       const resume = await Resume.findOne({ user_id });
//       console.log("Resume Query Result:", resume);
//         if (!resume.current_file_url) {
//           return res.status(404).json({ message: "No Current Resume Available" });
//       }

//       res.status(200).json({ file_url: resume.current_file_url });
//   } catch (error) {
//     console.error("Error fetching resume:", error);
//       res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };


// // GET All Resumes API
// const getAllResumes = async (req, res) => {
//   try {
//       const resumes = await Resume.find({}, "_id user_id current_file_url"); // Fetch all resumes with user_id and file_url

//       if (resumes.length === 0) {
//           return res.status(404).json({ message: "No resumes found" });
//       }

//       res.status(200).json({ resumes });

//   } catch (error) {
//       res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };
// // delete API
// const deleteResume = async (req, res) => {
//   try {
//     const { user_id } = req.user;

//     // Find resume in MongoDB
//     const resume = await Resume.findOne({ user_id });

//     if (!resume || !resume.current_file_url) {
//       return res.status(404).json({ message: "Resume not found in the database" });
//     }

//     // Extract the file key from S3 URL
//     const fileUrl = resume.current_file_url;
//     const bucketName = process.env.AWS_BUCKET_NAME;

//     if (!fileUrl.includes(`${bucketName}.s3.`)) {
//       return res.status(400).json({ message: "Invalid file URL format" });
//     }

//     const fileKey = fileUrl.split(`${bucketName}.s3.`)[1].split(".amazonaws.com/")[1];

//     if (!fileKey) {
//       return res.status(400).json({ message: "Could not extract file key from URL" });
//     }

//     // Check if resume exists in S3
//     try {
//       await s3.headObject({ Bucket: bucketName, Key: fileKey }).promise();
//     } catch (err) {
//       if (err.code === "NotFound") {
//         return res.status(200).json({ message: "Nothing to delete, all clear" });
//       }
//       throw err;
//     }

//     // Check if the resume is used in any job application
//     const resumeUsed = await Application.exists({ user_id });

//     if (resumeUsed) {
//       // Move the resume to the history folder
//       const historyFileKey = `history/${fileKey.split("/").pop()}`;

//       await s3.copyObject({
//         Bucket: bucketName,
//         CopySource: `${bucketName}/${fileKey}`,
//         Key: historyFileKey,
//       }).promise();

//       // Delete original resume from "resumes" folder
//       await s3.deleteObject({
//         Bucket: bucketName,
//         Key: fileKey,
//       }).promise();

//       // Update database: remove current_file_url & add previous_file_url
//       const historyFileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${historyFileKey}`;
//       await Resume.updateOne({ user_id }, { $set: { previous_file_url: historyFileUrl }, $unset: { current_file_url: 1 } });

//       return res.status(200).json({
//         message: "Resume moved to history folder",
//         previous_file_url: historyFileUrl,
//       });
//     }

//     // If resume is not used, delete it completely
//     await s3.deleteObject({
//       Bucket: bucketName,
//       Key: fileKey,
//     }).promise();

//     // Delete from MongoDB
//     await Resume.deleteOne({ user_id });

//     res.status(200).json({ message: "Resume deleted successfully" });

//   } catch (error) {
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };

// module.exports = {uploadResume, getResume,getAllResumes,deleteResume, saveRecommendationsToDB} ;
const s3 = require("../config/awsConfig");
const Resume = require("../models/resumes");
const Application = require("../models/Application");
const axios = require("axios");

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
    let resumeId;
    
    if (existingResume) {
      await Resume.updateOne(
        { _id: existingResume._id },
        {
          current_file_url: newFileUrl,
          previous_file_url: previousFileUrl || " ",
        }
      );
      resumeId = existingResume._id;
    } else {
      const newResume = await new Resume({
        user_id: userId,
        current_file_url: newFileUrl,
        previous_file_url: " ",
      }).save();
      resumeId = newResume._id;
    }
    console.log("Resume saved with ID:", resumeId);

    // Call external API after uploading resume
    const aiApiUrl = `http://44.202.97.91:8000/process_resume?userId=${userId}&resumeId=${resumeId}`;
    try {
      await axios.get(aiApiUrl);
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
    console.log("user id:", user_id);
    
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
