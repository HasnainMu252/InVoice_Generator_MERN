/**
 * Excel (.xlsx) import/export.
 *
 * Export and import share one schema, so a file downloaded from the app can be
 * edited and uploaded straight back. Nested data (order expenses, invoice line
 * items) lives on a second sheet keyed by the parent's code rather than being
 * packed into a delimited string — delimiters break the moment a description
 * contains the delimiter character, and these are free-text fields.
 *
 * Orders workbook   : "Orders"   + "Order Expenses"
 * Invoices workbook : "Invoices" + "Invoice Items"
 */
import type { Invoice, Order } from "@/lib/data";

type Row = Record<string, string | number | boolean | null>;

const loadXLSX = () => import("xlsx");

/* ------------------------------- helpers -------------------------------- */

const text = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

const num = (v: unknown) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const cleaned = text(v).replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const bool = (v: unknown) => {
  if (typeof v === "boolean") return v;
  return ["yes", "true", "1", "y"].includes(text(v).toLowerCase());
};

/** Excel may hand back a Date, a serial number, or a string. Normalise to YYYY-MM-DD. */
function isoDate(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excel serial: days since 1899-12-30.
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  const s = text(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

/** Case/space-insensitive column lookup, so "order code" matches "Order Code". */
function pick(row: Row, ...names: string[]) {
  const keys = Object.keys(row);
  for (const name of names) {
    const hit = keys.find((k) => k.trim().toLowerCase() === name.toLowerCase());
    if (hit !== undefined) return row[hit];
  }
  return undefined;
}

async function saveWorkbook(sheets: Array<{ name: string; rows: Row[] }>, filename: string) {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows.length ? sheet.rows : [{}]);
    // Give every column a sensible width — the default makes exports unreadable.
    const headers = Object.keys(sheet.rows[0] ?? {});
    ws["!cols"] = headers.map((h) => ({
      wch: Math.min(42, Math.max(12, h.length + 4)),
    }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/* -------------------------------- orders -------------------------------- */

export const ORDER_COLUMNS = [
  "Order Code",
  "Order Date",
  "Details",
  "Company",
  "Person Name",
  "Contact Number",
  "Service",
  "Total Amount",
  "Tax",
  "Notes",
] as const;

export const ORDER_EXPENSE_COLUMNS = ["Order Code", "Category", "Description", "Amount"] as const;

function orderToRow(o: Order): Row {
  return {
    "Order Code": o.order_code,
    "Order Date": o.order_date,
    Details: o.details,
    Company: o.company ?? "",
    "Person Name": o.contact_person,
    "Contact Number": o.contact_number,
    Service: o.service,
    "Total Amount": o.total_amount,
    Tax: o.tax,
    Notes: o.notes,
  };
}

export async function exportOrdersWorkbook(orders: Order[], filename = "cgs-orders") {
  const expenseRows: Row[] = orders.flatMap((o) =>
    (o.expenses ?? []).map((e) => ({
      "Order Code": o.order_code,
      Category: e.category,
      Description: e.description,
      Amount: e.amount,
    })),
  );

  await saveWorkbook(
    [
      { name: "Orders", rows: orders.map(orderToRow) },
      { name: "Order Expenses", rows: expenseRows },
    ],
    filename,
  );
}

/** A blank workbook with the right headers, for people starting from scratch. */
export async function downloadOrderTemplate() {
  await saveWorkbook(
    [
      {
        name: "Orders",
        rows: [
          {
            "Order Code": "CGS-ORD-0001",
            "Order Date": "2026-01-15",
            Details: "200 QTY Corporate Gift Boxes",
            Company: "Example Pvt Ltd",
            "Person Name": "Ahmed Raza",
            "Contact Number": "+92 300 1234567",
            Service: "Corporate Gifting",
            "Total Amount": 500000,
            Tax: 27500,
            Notes: "",
          },
        ],
      },
      {
        name: "Order Expenses",
        rows: [
          {
            "Order Code": "CGS-ORD-0001",
            Category: "Production",
            Description: "Gift box production",
            Amount: 362500,
          },
        ],
      },
    ],
    "cgs-orders-template",
  );
}

export type ParsedOrder = {
  order_code: string;
  order_date: string;
  details: string;
  company: string;
  contact_person: string;
  contact_number: string;
  service: string;
  total_amount: number;
  tax: number;
  notes: string;
  expenses: Array<{ category: string; description: string; amount: number }>;
};

export async function parseOrdersWorkbook(file: File): Promise<ParsedOrder[]> {
  const XLSX = await loadXLSX();
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });

  const orderSheet = wb.Sheets[wb.SheetNames.find((n) => /order/i.test(n) && !/expense/i.test(n)) ?? wb.SheetNames[0]!];
  if (!orderSheet) throw new Error("No Orders sheet found in that file.");
  const orderRows = XLSX.utils.sheet_to_json<Row>(orderSheet, { defval: "" });

  const expenseSheetName = wb.SheetNames.find((n) => /expense/i.test(n));
  const expenseRows = expenseSheetName
    ? XLSX.utils.sheet_to_json<Row>(wb.Sheets[expenseSheetName]!, { defval: "" })
    : [];

  const expensesByCode = new Map<string, ParsedOrder["expenses"]>();
  for (const row of expenseRows) {
    const code = text(pick(row, "Order Code", "order_code"));
    if (!code) continue;
    const amount = num(pick(row, "Amount", "amount"));
    const description = text(pick(row, "Description", "description"));
    if (!amount && !description) continue;
    if (!expensesByCode.has(code)) expensesByCode.set(code, []);
    expensesByCode.get(code)!.push({
      category: text(pick(row, "Category", "category")) || "Other",
      description,
      amount,
    });
  }

  return orderRows
    .filter((row) => text(pick(row, "Order Code", "order_code")) !== "")
    .map((row) => {
      const order_code = text(pick(row, "Order Code", "order_code"));
      return {
        order_code,
        order_date: isoDate(pick(row, "Order Date", "order_date")),
        details: text(pick(row, "Details", "details")),
        company: text(pick(row, "Company", "company")),
        contact_person: text(pick(row, "Person Name", "Contact Person", "contact_person")),
        contact_number: text(pick(row, "Contact Number", "contact_number")),
        service: text(pick(row, "Service", "service")) || "Corporate Gifting",
        total_amount: num(pick(row, "Total Amount", "total_amount")),
        tax: num(pick(row, "Tax", "tax")),
        notes: text(pick(row, "Notes", "notes")),
        expenses: expensesByCode.get(order_code) ?? [],
      };
    });
}

/* ------------------------------- invoices ------------------------------- */

function invoiceToRow(i: Invoice): Row {
  return {
    "Invoice Number": i.invoice_number,
    "Invoice Date": i.invoice_date,
    "Due Date": i.due_date ?? "",
    Status: i.status,
    Service: i.service,
    "Client Company": i.to_company,
    "Contact Person": i.to_contact_person,
    Phone: i.to_phone,
    Email: i.to_email,
    Address: i.to_address,
    NTN: i.to_ntn,
    "Delivery Charges": i.delivery_charges,
    "Other Charges": i.other_charges,
    "With Tax": i.with_tax ? "Yes" : "No",
    "Tax Rate": i.tax_rate,
    Notes: i.notes,
    "Grand Total": i.grand_total,
  };
}

export async function exportInvoicesWorkbook(invoices: Invoice[], filename = "cgs-invoices") {
  const itemRows: Row[] = invoices.flatMap((i) =>
    (i.invoice_items ?? []).map((it) => ({
      "Invoice Number": i.invoice_number,
      Description: it.description,
      Qty: it.qty,
      "Unit Price": it.unit_price,
      Total: it.total,
    })),
  );

  await saveWorkbook(
    [
      { name: "Invoices", rows: invoices.map(invoiceToRow) },
      { name: "Invoice Items", rows: itemRows },
    ],
    filename,
  );
}

export async function downloadInvoiceTemplate() {
  await saveWorkbook(
    [
      {
        name: "Invoices",
        rows: [
          {
            "Invoice Number": "CGS-INV-0001",
            "Invoice Date": "2026-01-15",
            "Due Date": "",
            Status: "Pending",
            Service: "Corporate Gifting",
            "Client Company": "Example Pvt Ltd",
            "Contact Person": "Ahmed Raza",
            Phone: "+92 300 1234567",
            Email: "ahmed@example.com",
            Address: "Karachi",
            NTN: "",
            "Delivery Charges": 0,
            "Other Charges": 0,
            "With Tax": "Yes",
            "Tax Rate": 18,
            Notes: "",
          },
        ],
      },
      {
        name: "Invoice Items",
        rows: [
          {
            "Invoice Number": "CGS-INV-0001",
            Description: "Corporate Gift Box",
            Qty: 100,
            "Unit Price": 3000,
          },
        ],
      },
    ],
    "cgs-invoices-template",
  );
}

export type ParsedInvoice = Record<string, unknown> & {
  invoice_number: string;
  invoice_date: string;
  items: Array<{ description: string; qty: number; unit_price: number }>;
};

export async function parseInvoicesWorkbook(file: File): Promise<ParsedInvoice[]> {
  const XLSX = await loadXLSX();
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });

  const invoiceSheetName =
    wb.SheetNames.find((n) => /invoice/i.test(n) && !/item/i.test(n)) ?? wb.SheetNames[0]!;
  const invoiceRows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[invoiceSheetName]!, { defval: "" });

  const itemSheetName = wb.SheetNames.find((n) => /item/i.test(n));
  const itemRows = itemSheetName
    ? XLSX.utils.sheet_to_json<Row>(wb.Sheets[itemSheetName]!, { defval: "" })
    : [];

  const itemsByNumber = new Map<string, ParsedInvoice["items"]>();
  for (const row of itemRows) {
    const number = text(pick(row, "Invoice Number", "invoice_number"));
    if (!number) continue;
    const description = text(pick(row, "Description", "description"));
    const qty = num(pick(row, "Qty", "Quantity", "qty"));
    if (!description && !qty) continue;
    if (!itemsByNumber.has(number)) itemsByNumber.set(number, []);
    itemsByNumber.get(number)!.push({
      description,
      qty,
      unit_price: num(pick(row, "Unit Price", "unit_price")),
    });
  }

  return invoiceRows
    .filter((row) => text(pick(row, "Invoice Number", "invoice_number")) !== "")
    .map((row) => {
      const invoice_number = text(pick(row, "Invoice Number", "invoice_number"));
      const status = text(pick(row, "Status", "status"));
      return {
        invoice_number,
        invoice_date: isoDate(pick(row, "Invoice Date", "invoice_date")),
        due_date: isoDate(pick(row, "Due Date", "due_date")) || null,
        status: ["Pending", "Approved", "Declined"].includes(status) ? status : "Pending",
        service: text(pick(row, "Service", "service")) || "Corporate Gifting",
        to_company: text(pick(row, "Client Company", "to_company")),
        to_contact_person: text(pick(row, "Contact Person", "to_contact_person")),
        to_phone: text(pick(row, "Phone", "to_phone")),
        to_email: text(pick(row, "Email", "to_email")),
        to_address: text(pick(row, "Address", "to_address")),
        to_ntn: text(pick(row, "NTN", "to_ntn")),
        delivery_charges: num(pick(row, "Delivery Charges", "delivery_charges")),
        other_charges: num(pick(row, "Other Charges", "other_charges")),
        with_tax: bool(pick(row, "With Tax", "with_tax")),
        tax_rate: num(pick(row, "Tax Rate", "tax_rate")),
        notes: text(pick(row, "Notes", "notes")),
        items: itemsByNumber.get(invoice_number) ?? [],
      };
    });
}
