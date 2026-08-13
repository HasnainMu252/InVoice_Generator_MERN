import { Router } from "express";
import jwt from "jsonwebtoken";

import { asyncHandler } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";

const router = Router();

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await User.findOne({
      username: new RegExp(`^${String(username).trim()}$`, "i"),
    }).select("+password");

    // Same message either way so the response can't be used to enumerate users.
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    return res.json({ token: signToken(user), user: user.toJSON() });
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => res.json({ user: req.user.toJSON() })),
);

router.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body ?? {};
    if (!new_password || String(new_password).length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }
    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.comparePassword(current_password ?? ""))) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
    user.password = new_password;
    await user.save();
    return res.json({ message: "Password updated" });
  }),
);

export default router;
