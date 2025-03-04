const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const chatRoutes = require("./routes/chatRoutes");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const Chat = require("./models/chat");

const app = express();
dotenv.config();
connectDB();

// Middleware
app.use(express.json());
app.use(cors());

// Create HTTP server and integrate Socket.IO
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this to your frontend URL (e.g., "http://localhost:3000") in production for security
    methods: ["GET", "POST"],
  },
  path: "/socket.io", // Match the path used in the frontend
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Handle joining a chat room (e.g., between two users)
  socket.on("joinRoom", ({ room }) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
    // Optionally, notify other users in the room
    io.to(room).emit("roomJoined", { room, socketId: socket.id });
  });

  // Handle leaving a chat room
  socket.on("leaveRoom", ({ room }) => {
    socket.leave(room);
    console.log(`User ${socket.id} left room: ${room}`);
    // Optionally, notify other users in the room
    io.to(room).emit("roomLeft", { room, socketId: socket.id });
  });

  // Handle sending a message within a room
  socket.on("message", async ({ room, content, userId }) => {
    try {
        // Construct message object without generating an ID manually
        const messageObj = {
            userId, // Sender's user ID
            content: content.content, // Message text
            sender: content.sender, // Socket.io ID of sender
            timestamp: new Date() // Timestamp
        };

        // Find or create chat room
        let chat = await Chat.findOne({ room });

        if (!chat) {
            chat = new Chat({ room, messages: [] });
        }

        // Push new message 
        chat.messages.push(messageObj);
        console.log("Message to be saved:", messageObj);
        await chat.save();

        // Get the last inserted message
        const newMessage = chat.messages[chat.messages.length - 1];
        console.log("Last inserted message:", newMessage);

        // Emit the newly created message
        io.to(room).emit("receiveMessage", newMessage);

        console.log(`Message stored & sent in room ${room}:`, newMessage);
    } catch (error) {
        console.error("Error saving message:", error);
    }
});


  // Handle typing indicator within a room
  socket.on("typing", ({ room, contactId }) => {
    // Broadcast typing status to other users in the room except the sender
    socket.to(room).emit("typing", { contactId });
    console.log(`User ${socket.id} is typing in room ${room} for contact ${contactId}`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // Optionally, notify rooms the user was in (if tracking rooms per user)
    // For simplicity, you can leave all rooms the user was in
    const rooms = Object.keys(socket.rooms).filter((room) => room !== socket.id);
    rooms.forEach((room) => {
      socket.leave(room);
      console.log(`User ${socket.id} left room ${room} on disconnect`);
      io.to(room).emit("userDisconnected", { socketId: socket.id });
    });
  });

  // Handle connection errors (optional, for debugging)
  socket.on("connect_error", (error) => {
    console.error(`Connection error for socket ${socket.id}:`, error.message);
  });
});


// Routes
app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/resumes", uploadRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/applications", applicationRoutes);

app.get("/", (req, res) => {
  res.send("API is running successfully ....");
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});