// const express = require("express")
// const mongoose = require("mongoose")
// const cors = require("cors")
// require("dotenv").config()
// const createError = require("http-errors")
// const cookieParser = require("cookie-parser")
// const logger = require("morgan")
// const path = require("path")
// const bodyParser = require("body-parser")
// const http = require ("http")
// const {setupWebSocketServer} = require ("./routes/websocketRoutes")
// const {connectDB,sequelize}= require ("./config/db.js");
// const{sequelize} =require("./config/db");
// const app = express()

// const server = http.createServer(app)
// // Enable CORS for all routes
// app.use(
//   cors({
//     origin: "*",
//     methods: ["GET", "POST", "PUT" ,"PATCH", "DELETE", "OPTIONS"],
//     credentials: true,
//     allowedHeaders: ["Content-Type", "Authorization"],
//   }),
// )
// const PORT = process.env.PORT || 5000

// // Middleware
// app.use(cors())
// app.use(bodyParser.json())
// app.use(bodyParser.urlencoded({ extended: true }))
// app.use("/uploads", express.static("uploads")) // Serve uploaded files
// app.use(express.json())
// app.use(logger("dev"))
// app.use(cookieParser())

// // MongoDB Connection
// connectDB(); // 🔄 connect to PostgreSQL
// // Sequelize Model Sync (optional: include models first)
// sequelize.sync().then(() => {
//   console.log("📦 All models synced with PostgreSQL");
// });
// // Serve static uploads
// app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// // Import Routes
// const loginRoutes = require("./routes/loginRoutes")
// const driverRoutes = require("./routes/driverRoutes")
// const forgotPasswordRoutes = require("./routes/forgotPasswordRoutes")
// const cabRoutes = require("./routes/cabRoutes")
// const cabAssignRoutes = require("./routes/cabAssignmentRoutes")
// const cabDetailsRoutes = require("./routes/cabsDetailsRoutes")
// const subAdminPermissions = require("./routes/subAdminPermissions")
// const expenseRoutes = require("./routes/subAdminExpenseRoute.js")
// const analyticsRoutes = require("./routes/adminRoutes.js");


// // Import email routes
// const emailRoutes = require("./routes/adminRoutes.js")
// const adminRoutes = require("./routes/adminRoutes")
// const masterAdmin = require("./routes/masterRoutes")
// const forpassRoutes = require("./routes/forPassRoutes")
// const servicingRoutes = require("./routes/servicing.js")

// // Routes of Subadmin
// app.use("/api", loginRoutes)
// app.use("/api/auth", forgotPasswordRoutes)
// app.use("/api/cabs", cabRoutes)
// app.use("/api/assigncab", cabAssignRoutes)
// app.use("/api/cabDetails", cabDetailsRoutes)
// app.use("/api/admin", adminRoutes)
// app.use("/api/password", forpassRoutes)
// app.use("/api/servicing", servicingRoutes)

// //Routes of Driver
// app.use("/api/driver", driverRoutes) 


// //Routes of MasterAdmin
// app.use("/api/master",masterAdmin)
// app.use("/api/subAdminPermissions", subAdminPermissions)
// app.use("/api/email", emailRoutes) // Use email routes with /api/email prefix
// app.use("/api/analytics", analyticsRoutes);
// app.use("/api/expenses", expenseRoutes)






// setupWebSocketServer(server);

// // Start Server
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`))



const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const createError = require("http-errors");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const path = require("path");
const OpenAI = require("openai");
const bodyParser = require("body-parser");
const http = require("http");

const { connectDB, sequelize } = require("./config/db.js");
dotenv.config();

// Start TCP server
require("./tcp/tcpServer.js");
// Start WebSocket server
require("./websocket/index.js");

// Initialize Express app and server
const app = express();
const server = http.createServer(app);

// PORT
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(logger("dev"));
app.use(cookieParser());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Connect MongoDB (if using both MongoDB + Sequelize)
connectDB();

// Sync Sequelize Models with PostgreSQL
sequelize.sync({ alter: true })
  .then(() => console.log("Tables synced"))
  .catch(err => console.error("Sync error", err));

// Import Routes
const loginRoutes = require("./routes/loginRoutes");
const driverRoutes = require("./routes/driverRoutes");
const forgotPasswordRoutes = require("./routes/forgotPasswordRoutes");
const cabRoutes = require("./routes/cabRoutes");
const cabAssignRoutes = require("./routes/cabAssignmentRoutes");
const cabDetailsRoutes = require("./routes/cabsDetailsRoutes");
const subAdminPermissions = require("./routes/subAdminPermissions");
const expenseRoutes = require("./routes/subAdminExpenseRoute");
const analyticsRoutes = require("./routes/adminRoutes"); // handles analytics too
const emailRoutes = require("./routes/adminRoutes");     // for email (if reused)
const adminRoutes = require("./routes/adminRoutes");
const masterAdminRoutes = require("./routes/masterRoutes");
const forpassRoutes = require("./routes/forPassRoutes");
const servicingRoutes = require("./routes/servicing");
const fasttagRoutes = require("./routes/fasttagRoutes");
// Apply Routes

// Subadmin and Admin Routes
app.use("/api", loginRoutes);
app.use("/api/auth", forgotPasswordRoutes);
app.use("/api/password", forpassRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/email", emailRoutes); // email sending logic if handled in adminRoutes
app.use("/api/analytics", analyticsRoutes);
app.use("/api/subAdminPermissions", subAdminPermissions);
app.use("/api/expenses", expenseRoutes);

// Cab Related
app.use("/api/cabs", cabRoutes);
app.use("/api/assigncab", cabAssignRoutes);
app.use("/api/cabDetails", cabDetailsRoutes);
app.use("/api/servicing", servicingRoutes);

// Driver
app.use("/api/driver", driverRoutes);

// Master Admin
app.use("/api/master", masterAdminRoutes);

app.post("/api/ai-response", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const message = completion.choices[0].message.content;
    res.status(200).json({ result: message });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});


app.use("/api/fasttag", fasttagRoutes);


// WebSocket server is started above

// Fallback for unknown routes
app.use((req, res, next) => {
  next(createError(404, "Route not found"));
});

// Error handler middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Express API running on http://localhost:${PORT}`);
  console.log(`TCP and WebSocket servers started in same process.`);
});
