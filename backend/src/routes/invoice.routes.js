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

/**
 * Bulk import. The client parses the workbook (Invoices + Invoice Items sheets)
 * and posts assembled rows; totals are still recomputed server-side.
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
    if (mode === "replace") await Invoice.deleteMany({});

    const imported = [];
    const errors = [];

    for (let i = 0; i < rows.length; i += 1) {
      const rowNumber = i + 2;
      try {
        const row = rows[i];
        if (!row?.invoice_number) {
          errors.push({ row: rowNumber, message: "Invoice Number is required" });
          continue;
        }
        if (!row?.invoice_date) {
          errors.push({ row: rowNumber, message: "Invoice Date is required" });
          continue;
        }
        const payload = { ...sanitise(row), ...computeInvoiceTotals(row) };
        // Upsert on invoice_number so an exported file can be re-imported.
        await Invoice.findOneAndUpdate({ invoice_number: row.invoice_number }, payload, {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        });
        imported.push(row.invoice_number);
      } catch (error) {
        errors.push({ row: rowNumber, message: error.message });
      }
    }

    return res.json({ imported: imported.length, failed: errors.length, errors: errors.slice(0, 50) });
  }),
);

/** Deletes every invoice. Irreversible — the UI requires a typed confirmation. */
router.delete(
  "/",
  asyncHandler(async (_req, res) => {
    const { deletedCount } = await Invoice.deleteMany({});
    res.json({ message: `Deleted ${deletedCount} invoice(s)`, deleted: deletedCount });
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
