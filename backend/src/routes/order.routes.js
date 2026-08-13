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

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json({ message: "Order deleted" });
  }),
);

export default router;
