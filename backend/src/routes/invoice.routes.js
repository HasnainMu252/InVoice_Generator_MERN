import { Router } from "express";

import { asyncHandler } from "../middleware/error.js";
import Invoice from "../models/Invoice.js";
import Settings from "../models/Settings.js";
import { INVOICE_STATUSES, computeInvoiceTotals } from "../utils/calc.js";

const router = Router();

/** Strips client-supplied values that the server owns. */
function sanitise(body) {
  const {
    id,
    _id,
    items,
    invoice_items,
    subtotal,
    tax_amount,
    grand_total,
    created_at,
    updated_at,
    ...rest
  } = body ?? {};
  return rest;
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const invoices = await Invoice.find().sort({ invoice_date: -1, created_at: -1 });
    res.json(invoices);
  }),
);

router.get(
  "/next-number",
  asyncHandler(async (_req, res) => {
    const settings = await Settings.findOne({ key: "default" });
    const prefix = settings?.invoice_prefix || "CGS-INV-";
    const invoices = await Invoice.find().select("invoice_number").lean();
    const highest = invoices.reduce((max, row) => {
      const n = Number(String(row.invoice_number).replace(/\D/g, ""));
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    res.json({ invoice_number: `${prefix}${String(highest + 1).padStart(4, "0")}` });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    return res.json(invoice);
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.create({ ...sanitise(req.body), ...computeInvoiceTotals(req.body) });
    res.status(201).json(invoice);
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { ...sanitise(req.body), ...computeInvoiceTotals(req.body) },
      { new: true, runValidators: true },
    );
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    return res.json(invoice);
  }),
);

/** Status is edited only from the All Invoices list. */
router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = req.body ?? {};
    if (!INVOICE_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    return res.json(invoice);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    return res.json({ message: "Invoice deleted" });
  }),
);

export default router;
