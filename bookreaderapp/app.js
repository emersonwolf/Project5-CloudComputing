// app.js
const express = require("express");
const path = require("path");
const { createClient } = require("redis");

const app = express();
const PORT = process.env.PORT || 3000;

// ----- Redis Setup -----
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Client Error:", err);
});

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  // send index.html from /public
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Test Redis endpoint
app.get("/test-redis", async (req, res) => {
  try {
    const newValue = await redisClient.incr("test:hit_count");

    res.json({
      ok: true,
      message: "Successfully talked to Redis!",
      hit_count: newValue,
    });
  } catch (err) {
    console.error("Error talking to Redis:", err);
    res.status(500).json({
      ok: false,
      error: "Failed to talk to Redis. Check server logs.",
    });
  }
});

// Start server
async function start() {
  try {
    await redisClient.connect();
    console.log("✅ Connected to Redis");

    app.listen(PORT, () => {
      console.log(`✅ Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start app:", err);
    process.exit(1);
  }
}

start();
