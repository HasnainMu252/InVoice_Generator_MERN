/**
 * Lazy entry point for PDF generation.
 *
 * jsPDF + jspdf-autotable (and their html2canvas / dompurify dependencies) are
 * ~420KB. Importing `@/lib/pdf` directly from a page pulls all of that into the
 * page's chunk, so simply *opening* Invoices downloaded the PDF engine even if
 * the user never exported anything. These wrappers defer the import to the
 * moment an export is actually clicked.
 */
import type { Invoice, Order, Settings } from "@/lib/data";

type TableOptions = {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  summary?: Array<[string, string]>;
  filename: string;
  landscape?: boolean;
};

const loadPdf = () => import("@/lib/pdf");

export async function downloadInvoicePdf(invoice: Invoice, settings: Settings | null) {
  return (await loadPdf()).downloadInvoicePdf(invoice, settings);
}

export async function printInvoicePdf(invoice: Invoice, settings: Settings | null) {
  return (await loadPdf()).printInvoicePdf(invoice, settings);
}

export async function downloadOrderPdf(order: Order, settings: Settings | null) {
  return (await loadPdf()).downloadOrderPdf(order, settings);
}

export async function exportTablePdf(options: TableOptions) {
  return (await loadPdf()).exportTablePdf(options);
}
