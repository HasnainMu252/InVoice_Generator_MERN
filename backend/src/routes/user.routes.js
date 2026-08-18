import { Router } from "express";

import { asyncHandler } from "../middleware/error.js";
import User from "../models/User.js";

const router = Router();

const MIN_PASSWORD = 8;

/** Shared validation for create/update. */
function validate({ username, password, role }, { requirePassword }) {
  if (!username || !String(username).trim()) return "Username is required";
  if (String(username).trim().length < 3) return "Username must be at least 3 characters";
  if (requirePassword || password) {
    if (!password || String(password).length < MIN_PASSWORD) {
      return `Password must be at least ${MIN_PASSWORD} characters`;
    }
  }
  if (role && !["admin", "staff"].includes(role)) return "Invalid role";
  return null;
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await User.find().sort({ createdAt: 1 });
    res.json(users);
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const error = validate(req.body ?? {}, { requirePassword: true });
    if (error) return res.status(400).json({ message: error });

    const { username, password, full_name, email, phone, role } = req.body;
    const user = await User.create({
      username: String(username).trim(),
      password,
      full_name: full_name ?? "",
      email: email ?? "",
      phone: phone ?? "",
      role: role ?? "staff",
    });
    return res.status(201).json(user);
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const error = validate({ ...req.body, password: undefined }, { requirePassword: false });
    if (error) return res.status(400).json({ message: error });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { username, full_name, email, phone, role, active } = req.body ?? {};

    // Guard against an admin demoting or deactivating the last remaining admin
    // and locking everybody out of user management permanently.
    const losingAdmin =
      user.role === "admin" && ((role && role !== "admin") || active === false);
    if (losingAdmin) {
      const admins = await User.countDocuments({ role: "admin", active: true });
      if (admins <= 1) {
        return res.status(400).json({ message: "There must be at least one active administrator." });
      }
    }

    user.username = String(username).trim();
    if (full_name !== undefined) user.full_name = full_name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined) user.role = role;
    if (active !== undefined) user.active = Boolean(active);
    await user.save();

    return res.json(user);
  }),
);

/** Admin resets another user's password. No current-password challenge. */
router.patch(
  "/:id/password",
  asyncHandler(async (req, res) => {
    const { new_password } = req.body ?? {};
    if (!new_password || String(new_password).length < MIN_PASSWORD) {
      return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters` });
    }
    const user = await User.findById(req.params.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = new_password;
    await user.save();
    return res.json({ message: `Password updated for ${user.username}` });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin") {
      const admins = await User.countDocuments({ role: "admin", active: true });
      if (admins <= 1) {
        return res.status(400).json({ message: "There must be at least one active administrator." });
      }
    }

    await user.deleteOne();
    return res.json({ message: "User deleted" });
  }),
);

export default router;
