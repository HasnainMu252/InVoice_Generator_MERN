import { Router } from "express";

import { asyncHandler } from "../middleware/error.js";
import Order from "../models/Order.js";
import { monthLabel, normaliseExpenses, toNum } from "../utils/calc.js";

const router = Router();

function buildPayload(body) {
  const order_date = body.order_date || new Date().toISOString().slice(0, 10);
  return {
    order_code: String(body.order_code ?? "").trim(),
    order_date,
    details: body.details ?? "",
    company: body.company ?? "",
    contact_person: body.contact_person ?? "",
    contact_number: body.contact_number ?? "",
    total_amount: toNum(body.total_amount),
    tax: toNum(body.tax),
    // Derived server-side so the stored month can never drift from the date.
    month: monthLabel(order_date),
    service: body.service ?? "Corporate Gifting",
    notes: body.notes ?? "",
    expenses: normaliseExpenses(body.expenses),
  };
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const orders = await Order.find().sort({ order_date: -1, created_at: -1 });
    res.json(orders);
  }),
);

router.get(
  "/next-code",
  asyncHandler(async (_req, res) => {
    const orders = await Order.find().select("order_code").lean();
    const highest = orders.reduce((max, row) => {
      const n = Number(String(row.order_code).replace(/\D/g, ""));
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    res.json({ order_code: `CGS-ORD-${String(highest + 1).padStart(4, "0")}` });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json(order);
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = buildPayload(req.body);
    if (!payload.order_code) return res.status(400).json({ message: "Order code is required" });
    const order = await Order.create(payload);
    res.status(201).json(order);
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await Order.findByIdAndUpdate(req.params.id, buildPayload(req.body), {
      new: true,
      runValidators: true,
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json(order);
  }),
);

/**
 * Bulk import. Rows arrive already parsed from the .xlsx on the client; the
 * server still rebuilds every payload so imported data goes through exactly the
 * same validation and month/expense normalisation as the form.
 */
router.post(
  "/bulk",
  asyncHandler(async (req, res) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) return res.status(400).json({ message: "No rows to import" });
    if (rows.length > 2000) {
      return res.status(400).json({ message: "Too many rows — import 2000 at a time or fewer." });
    }

    const mode = req.body?.mode === "replace" ? "replace" : "append";
    if (mode === "replace") await Order.deleteMany({});

    const created = [];
    const errors = [];

    for (let i = 0; i < rows.length; i += 1) {
      const rowNumber = i + 2; // +2: header row, and spreadsheets are 1-indexed
      try {
        const payload = buildPayload(rows[i]);
        if (!payload.order_code) {
          errors.push({ row: rowNumber, message: "Order Code is required" });
          continue;
        }
        // Upsert on order_code so re-importing an exported file updates rather
        // than exploding on the unique index.
        const saved = await Order.findOneAndUpdate(
          { order_code: payload.order_code },
          payload,
          { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
        );
        created.push(saved.order_code);
      } catch (error) {
        errors.push({ row: rowNumber, message: error.message });
      }
    }

    return res.json({ imported: created.length, failed: errors.length, errors: errors.slice(0, 50) });
  }),
);

/** Deletes every order. Irreversible — the UI requires a typed confirmation. */
router.delete(
  "/",
  asyncHandler(async (_req, res) => {
    const { deletedCount } = await Order.deleteMany({});
    res.json({ message: `Deleted ${deletedCount} order(s)`, deleted: deletedCount });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json({ message: "Order deleted" });
  }),
);

export default router;
