const { MongoClient } = require("mongodb");

// MongoDB connection URI and configuration
const uri = "mongodb+srv://jobportal:1234@jobportal.or090.mongodb.net";
const dbName = "jobPortalDB";
const collectionName = "users";

// Function to remove added fields
async function removeFields() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Define the fields to remove
    const fieldsToRemove = ["user_id"]; // Add fields you want to remove here

    // Construct $unset object dynamically
    const unsetFields = {};
    fieldsToRemove.forEach((field) => {
      unsetFields[field] = "";
    });

    // Update all documents to remove specified fields
    const result = await collection.updateMany({}, { $unset: unsetFields });

    console.log(`Removed fields from ${result.modifiedCount} documents.`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

// Run the removal function
removeFields();
