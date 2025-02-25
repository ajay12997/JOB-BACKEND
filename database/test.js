const B2 = require("backblaze-b2");

const b2 = new B2({
  applicationKeyId: "0b7390f5ec4e",  // Replace with your actual Key ID
  applicationKey: "K005PyDeorBv47vxrEyJ7/ezhZEtugg", // Replace with your actual App Key
});

(async () => {
  try {
    await b2.authorize();
    console.log("✅ B2 Authentication Successful");
  } catch (error) {
    console.error("❌ B2 Authentication Error:", error);
  }
})();
