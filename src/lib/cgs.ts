export const APP_NAME = "CGS Finance System";
export const COMPANY_NAME = "CORPORATE GIFTING SOLUTION";

export const SERVICES = [
  "Corporate Gifting",
  "Corporate Event Planning",
  "Digital Solution",
] as const;

export const INVOICE_STATUSES = ["Pending", "Approved", "Declined"] as const;

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
] as const;

export type Service = (typeof SERVICES)[number];
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
