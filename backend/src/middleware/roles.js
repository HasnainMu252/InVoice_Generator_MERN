/**
 * Admin-only guard. Roles are enforced here on the server — hiding a button in
 * the UI is a convenience, not a security control.
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Only an administrator can do that." });
  }
  return next();
}
