// app.js
const express = require("express");
const { createClient } = require("redis");

const app = express();
const PORT = process.env.PORT || 3000;

// ----- Redis client setup -----
const redisClient = createClient({
  // By default, connects to redis://localhost:6379
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Client Error:", err);
});

// ----- Express middleware -----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple home page
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Redis Test App</title>
      </head>
      <body style="font-family: system-ui, sans-serif;">
        <h1>Redis Test App</h1>
        <p>If you can hit the <a href="/test-redis">/test-redis</a> endpoint and see a JSON response, your Node app can talk to Redis.</p>
      </body>
    </html>
  `);
});

// Route to test Redis connectivity
app.get("/test-redis", async (req, res) => {
  try {
    // Increment a test key each time this endpoint is hit
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

// ----- Start server only after Redis connects -----
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
