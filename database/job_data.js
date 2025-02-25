const { MongoClient } = require("mongodb");
const fs = require("fs");
const csv = require("csv-parser");

// MongoDB connection URI and configuration
const uri = "mongodb+srv://jobportal:1234@jobportal.or090.mongodb.net";
const dbName = "jobPortalDB";
const collectionName = "jobpost";

// Function to update documents
async function updateDocuments() {
  const client = new MongoClient(uri);

  try {
    await client.connect(); // Ensure the client is connected before proceeding
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Read CSV file
    const csvData = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream("jobpost.csv")
        .pipe(csv())
        .on("data", (row) => {
          csvData.push(row);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("CSV file successfully processed");

    // Fetch all documents from the collection
    const documents = await collection.find().toArray();

    if (csvData.length > documents.length) {
      console.warn(
        "Warning: The CSV file contains more rows than the number of documents in the collection."
      );
    }

    // Prepare bulk operations
    const bulkOps = [];
    for (let i = 0; i < csvData.length; i++) {
      if (i < documents.length) {
        const documentId = documents[i]._id; // Assuming documents have _id
        const updateFields = { ...csvData[i] }; // Use all fields from the CSV row

        bulkOps.push({
          updateOne: {
            filter: { _id: documentId },
            update: { $set: updateFields },
          },
        });
      }
    }

    // Execute bulk operations
    if (bulkOps.length > 0) {
      const result = await collection.bulkWrite(bulkOps);
      console.log(
        `Bulk update completed. Modified ${result.modifiedCount} documents.`
      );
    } else {
      console.log("No updates were performed.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close(); // Ensure the client is closed after operations
    console.log("MongoDB connection closed");
  }
}

// Run the update function
updateDocuments();
