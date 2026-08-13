import "dotenv/config";

import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    createApp().listen(PORT, () => {
      console.log(`[api] listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("[api] failed to start:", error.message);
    process.exit(1);
  }
}

start();
