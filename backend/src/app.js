import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";

import { errorHandler, notFound } from "./middleware/error.js";
import { requireAuth } from "./middleware/auth.js";
import { requireAdmin } from "./middleware/roles.js";
import authRoutes from "./routes/auth.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import orderRoutes from "./routes/order.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import userRoutes from "./routes/user.routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(","),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "12mb" })); // bulk imports post large JSON payloads
  if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

  // Brute-force protection on the only unauthenticated endpoint.
  app.use(
    "/api/auth/login",
    rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }),
  );

  app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  app.use("/api/auth", authRoutes);
  app.use("/api/invoices", requireAuth, invoiceRoutes);
  app.use("/api/orders", requireAuth, orderRoutes);
  app.use("/api/settings", requireAuth, settingsRoutes);
  // User management is the one area staff cannot reach.
  app.use("/api/users", requireAuth, requireAdmin, userRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
