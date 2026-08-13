export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

/* eslint-disable-next-line no-unused-vars */
export function errorHandler(err, _req, res, _next) {
  console.error("[error]", err);

  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? "value";
    return res.status(409).json({ message: `That ${field} is already in use.` });
  }
  if (err?.name === "ValidationError") {
    return res.status(400).json({ message: Object.values(err.errors)[0]?.message ?? "Invalid data" });
  }
  if (err?.name === "CastError") {
    return res.status(400).json({ message: "Invalid identifier" });
  }

  return res.status(err.status || 500).json({ message: err.message || "Something went wrong" });
}

/** Wraps an async handler so rejections reach errorHandler instead of hanging. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
