/**
 * Pure money/derivation helpers. Kept free of Mongoose so the business rules
 * can be unit-tested and so the server — never the client — owns every total.
 */

export const EXPENSE_CATEGORIES = [
  "Production",
  "Packaging",
  "Printing",
  "Delivery",
  "Transport",
  "Marketing",
  "Event",
  "Staff",
  "Other",
];

export const SERVICES = ["Corporate Gifting", "Corporate Event Planning", "Digital Solution"];
export const INVOICE_STATUSES = ["Pending", "Approved", "Declined"];

export function toNum(value) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Rounds to 2dp to keep floating point noise out of stored currency values. */
export const money = (n) => Math.round(toNum(n) * 100) / 100;

export function monthLabel(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Invoice maths, per spec:
 *   item total  = qty x unit price
 *   subtotal    = sum(item totals)
 *   before tax  = subtotal + delivery + other
 *   tax         = before tax x rate / 100   (0 when tax is off)
 *   grand total = before tax + tax
 */
export function computeInvoiceTotals(body = {}) {
  const source = body.items ?? body.invoice_items ?? [];
  const invoice_items = source
    .filter((it) => String(it.description ?? "").trim() !== "" || toNum(it.total) > 0 || toNum(it.qty) * toNum(it.unit_price) > 0)
    .map((it, index) => {
      const qty = toNum(it.qty);
      const unit_price = toNum(it.unit_price);
      return {
        sort_order: index + 1,
        description: String(it.description ?? ""),
        qty,
        unit_price,
        total: money(qty * unit_price),
      };
    });

  const subtotal = money(invoice_items.reduce((sum, it) => sum + it.total, 0));
  const delivery_charges = money(body.delivery_charges);
  const other_charges = money(body.other_charges);
  const beforeTax = money(subtotal + delivery_charges + other_charges);

  const with_tax = Boolean(body.with_tax);
  const tax_rate = with_tax ? toNum(body.tax_rate) : 0;
  const tax_amount = with_tax ? money((beforeTax * tax_rate) / 100) : 0;

  return {
    invoice_items,
    subtotal,
    delivery_charges,
    other_charges,
    with_tax,
    tax_rate,
    tax_amount,
    grand_total: money(beforeTax + tax_amount),
  };
}

/** Drops blank rows and forces unknown categories to "Other". */
export function normaliseExpenses(list) {
  return (list ?? [])
    .filter((e) => toNum(e.amount) > 0 || String(e.description ?? "").trim() !== "")
    .map((e) => ({
      category: EXPENSE_CATEGORIES.includes(e.category) ? e.category : "Other",
      description: String(e.description ?? "").trim(),
      amount: money(e.amount),
    }));
}

/** Order maths: Total Profit = Total Order Amount − Total Expense Amount. */
export function computeOrderTotals(expenses) {
  const expense_total = money((expenses ?? []).reduce((sum, e) => sum + toNum(e.amount), 0));
  return { expense_total };
}
