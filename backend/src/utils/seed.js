/**
 * First-run setup.
 *
 * Creates the settings document and the initial administrator account.
 * It does NOT create demo orders or invoices — the system starts empty so the
 * first real numbers you see are your own.
 *
 * Safe to re-run: nothing is deleted, and an existing admin is left untouched.
 */
import "dotenv/config";
import mongoose from "mongoose";

import { connectDB } from "../config/db.js";
import Settings from "../models/Settings.js";
import User from "../models/User.js";

async function seed() {
  await connectDB();

  const username = process.env.ADMIN_USERNAME || "CGS123";
  const password = process.env.ADMIN_PASSWORD || "Cgs@Global1ok";

  const settings = await Settings.findOne({ key: "default" });
  if (settings) {
    console.log("[seed] settings already present — left untouched");
  } else {
    await Settings.create({ key: "default" });
    console.log("[seed] settings created");
  }

  const existing = await User.findOne({ username });
  if (existing) {
    console.log(`[seed] admin "${username}" already exists — left untouched`);
  } else {
    await User.create({ username, password, full_name: "CGS Administrator", role: "admin" });
    console.log(`[seed] admin created: ${username}`);
    console.log("[seed] change this password from Profile after your first login.");
  }

  const orders = await mongoose.connection.collection("orders").countDocuments();
  const invoices = await mongoose.connection.collection("invoices").countDocuments();
  console.log(`[seed] existing data: ${orders} order(s), ${invoices} invoice(s) — untouched`);

  await mongoose.connection.close();
  console.log("[seed] done");
}

seed().catch(async (error) => {
  console.error("[seed] failed:", error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
