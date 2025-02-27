const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const chatRoutes = require("./routes/chatRoutes");
const Chat = require("./models/chat");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");



dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

app.use(express.json());
app.use(cors());

app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes); 
app.use("/api/resumes", uploadRoutes);
app.use("/chat", chatRoutes);
app.use("/api/applications", applicationRoutes);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", ({ jobId, userId }) => {
    socket.join(jobId);
    console.log(`User ${userId} joined room ${jobId}`);
  });

  socket.on("sendMessage", async ({ senderId, receiverId, jobId, message }) => {
    const chatMessage = new Chat({ senderId, receiverId, jobId, message });
    await chatMessage.save();

    io.to(jobId).emit("receiveMessage", { senderId, receiverId, jobId, message });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

app.get("/", (req, res) => {
  res.send("API is running successfully ....");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
