const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const path = require("path");
const bodyParser = require("body-parser");
const http = require("http");
const { OpenAI } = require("openai");  // Add OpenAI import

const { connectDB, sequelize } = require("./config/db.js");
const { getLastSeenSnapshot } = require("./tcp/tcpServer.js");
dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middlewares
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

// Start DBs
connectDB();
sequelize.sync({ alter: true }).then(() => console.log("📊 DB Synced"));

// Start TCP + WebSocket servers
const { startTcpServer } = require("./tcp/tcpServer.js");
const { initWebSocket } = require("./websocket");

// Routes
app.get("/", (req, res) => res.send("✅ API is running"));

// Debug: last seen GPS snapshot per IMEI (optionally secure with auth middleware)
app.get("/api/debug/gps/:imei", (req, res) => {
  try {
    const { imei } = req.params;
    if (!imei) return res.status(400).json({ message: "IMEI is required" });
    const snapshot = getLastSeenSnapshot(imei);
    if (!snapshot) return res.status(404).json({ message: "No snapshot for this IMEI yet" });
    return res.json({ imei, snapshot });
  } catch (err) {
    console.error("/api/debug/gps error", err);
    return res.status(500).json({ message: "Internal error" });
  }
});

// Import Routes
const loginRoutes = require("./routes/loginRoutes");
const driverRoutes = require("./routes/driverRoutes");
const forgotPasswordRoutes = require("./routes/forgotPasswordRoutes");
const cabRoutes = require("./routes/cabRoutes");
const cabAssignRoutes = require("./routes/cabAssignmentRoutes");
const cabDetailsRoutes = require("./routes/cabsDetailsRoutes");
const subAdminPermissions = require("./routes/subAdminPermissions");
const expenseRoutes = require("./routes/subAdminExpenseRoute");
const analyticsRoutes = require("./routes/adminRoutes");
const emailRoutes = require("./routes/adminRoutes");
const adminRoutes = require("./routes/adminRoutes");
const masterAdminRoutes = require("./routes/masterRoutes");
const forpassRoutes = require("./routes/forPassRoutes");
const servicingRoutes = require("./routes/servicing");
const fasttagRoutes = require("./routes/fasttagRoutes");

// Apply Routes
app.use("/api", loginRoutes);
app.use("/api/auth", forgotPasswordRoutes);
app.use("/api/password", forpassRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/subAdminPermissions", subAdminPermissions);
app.use("/api/expenses", expenseRoutes);
app.use("/api/cabs", cabRoutes);
app.use("/api/assigncab", cabAssignRoutes);
app.use("/api/cabDetails", cabDetailsRoutes);
app.use("/api/servicing", servicingRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/master", masterAdminRoutes);
app.use("/api/fasttag", fasttagRoutes);

// OpenAI route
app.post("/api/ai-response", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [{ role: "user", content: prompt }],
    });
    res.status(200).json({ result: completion.choices[0].message.content });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

// Fallback for unknown routes
app.use((req, res, next) => {
  const createError = require('http-errors');
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
  // Attach WebSocket server to HTTP server at path /ws (supports WSS via proxy)
  initWebSocket(server);
  startTcpServer();  // Start TCP server after Express is running
  console.log(`🌐 TCP and WebSocket servers started in same process`);
});
