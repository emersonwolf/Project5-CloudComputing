// app.js
const express = require("express");
const path = require("path");
const fs = require("fs");
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

// Display HomePage by default
app.get("/", (req, res) => {
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

// Load books into redis
async function loadBookIntoRedis(bookId, filename) {
  const filePath = path.join(__dirname, "data", filename);

  // 1) Read file
  const raw = await fs.promises.readFile(filePath, "utf8");

  // 2) Normalize & tokenize
  const text = raw.toLowerCase();
  // grab sequences of letters / apostrophes as "words"
  const tokens = text.match(/[a-z']+/g) || [];

  const counts = new Map();
  let totalWords = 0;

  for (let t of tokens) {
    // trim leading/trailing apostrophes: 'word' -> word
    const word = t.replace(/^'+|'+$/g, "");
    if (!word) continue;

    totalWords += 1;
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  const distinctWords = counts.size;

  // 3) Store in Redis:
  //    - Hash for word -> count
  //    - Separate keys for basic stats
  const hashKey = `book:${bookId}:wordcount`;
  const totalKey = `book:${bookId}:total_words`;
  const distinctKey = `book:${bookId}:distinct_words`;

  // Convert Map to plain object for hSet
  const wordCountObject = Object.fromEntries(counts);

  // Clear any previous data for that book
  await redisClient.del(hashKey, totalKey, distinctKey);

  // hSet with an object: field = word, value = count
  await redisClient.hSet(hashKey, wordCountObject);
  await redisClient.set(totalKey, totalWords.toString());
  await redisClient.set(distinctKey, distinctWords.toString());

  return { totalWords, distinctWords };
}

// Route to trigger the load (one-time or whenever)
app.get("/load-book", async (req, res) => {
  try {
    // You can change these to different books later
    const bookId = "pride_and_prejudice";
    const filename = "pride_and_prejudice.txt";

    const stats = await loadBookIntoRedis(bookId, filename);

    res.json({
      ok: true,
      bookId,
      message: "Book loaded into Redis",
      stats,
    });
  } catch (err) {
    console.error("Error loading book:", err);
    res.status(500).json({
      ok: false,
      error: "Failed to load book into Redis. See server logs.",
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
