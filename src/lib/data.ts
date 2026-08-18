import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

/* ---------------------------------- types ---------------------------------- */

export type InvoiceItem = {
  id?: string;
  sort_order: number;
  description: string;
  qty: number;
  unit_price: number;
  total: number;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  status: string;
  service: string;
  from_company: string;
  from_ntn: string;
  from_website: string;
  from_phone: string;
  from_email: string;
  to_contact_person: string;
  to_company: string;
  to_phone: string;
  to_email: string;
  to_address: string;
  to_ntn: string;
  subtotal: number;
  delivery_charges: number;
  other_charges: number;
  with_tax: boolean;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  notes: string;
  created_at: string;
  invoice_items?: InvoiceItem[];
};

/** A single purchasing/expense line captured inside the Order Form. */
export type OrderExpenseLine = {
  id?: string;
  category: string;
  description: string;
  amount: number;
};

export type Order = {
  id: string;
  order_code: string;
  order_date: string;
  details: string;
  company: string;
  contact_person: string;
  contact_number: string;
  total_amount: number;
  tax: number;
  month: string;
  service: string;
  notes: string;
  created_at: string;
  expenses: OrderExpenseLine[];
  /** Server-derived: sum of the expense breakdown. */
  expense_total: number;
  /** Server-derived: total_amount − expense_total. */
  profit: number;
};

export type Settings = {
  id: string;
  company_name: string;
  ntn: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  logo_url: string;
  bank_title: string;
  bank_account: string;
  bank_iban: string;
  bank_name: string;
  invoice_prefix: string;
  default_tax_rate: number;
  default_notes: string;
};

/* --------------------------------- invoices -------------------------------- */

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async (): Promise<Invoice[]> => (await api.get("/invoices")).data,
  });
}

export function useInvoice(id?: string) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: async (): Promise<Invoice> => (await api.get(`/invoices/${id}`)).data,
    enabled: Boolean(id),
  });
}

export type InvoicePayload = Omit<Invoice, "id" | "created_at" | "invoice_items"> & {
  items: InvoiceItem[];
};

export function useSaveInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: InvoicePayload }) => {
      const res = id
        ? await api.put(`/invoices/${id}`, payload)
        : await api.post("/invoices", payload);
      return res.data as Invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice"] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/invoices/${id}/status`, { status })).data as Invoice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice"] });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/invoices/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useDeleteAllInvoices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.delete("/invoices")).data as { deleted: number },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useImportInvoices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rows, mode }: { rows: unknown[]; mode: "append" | "replace" }) =>
      (await api.post("/invoices/bulk", { rows, mode })).data as {
        imported: number;
        failed: number;
        errors: Array<{ row: number; message: string }>;
      },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export async function nextInvoiceNumber(): Promise<string> {
  return (await api.get("/invoices/next-number")).data.invoice_number;
}

/* ---------------------------------- orders --------------------------------- */

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async (): Promise<Order[]> => (await api.get("/orders")).data,
  });
}

export function useOrder(id?: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async (): Promise<Order> => (await api.get(`/orders/${id}`)).data,
    enabled: Boolean(id),
  });
}

export type OrderPayload = Omit<
  Order,
  "id" | "created_at" | "expense_total" | "profit" | "month"
> & { month?: string };

export function useSaveOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: OrderPayload }) => {
      const res = id ? await api.put(`/orders/${id}`, payload) : await api.post("/orders", payload);
      return res.data as Order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order"] });
    },
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/orders/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useDeleteAllOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.delete("/orders")).data as { deleted: number },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export type BulkResult = {
  imported: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
};

export function useImportOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rows, mode }: { rows: unknown[]; mode: "append" | "replace" }) =>
      (await api.post("/orders/bulk", { rows, mode })).data as BulkResult,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export async function nextOrderCode(): Promise<string> {
  return (await api.get("/orders/next-code")).data.order_code;
}

/* ---------------------------------- users ---------------------------------- */

export type AppUser = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  role: "admin" | "staff";
  active: boolean;
  last_login_at: string | null;
  createdAt: string;
};

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<AppUser[]> => (await api.get("/users")).data,
    enabled,
  });
}

export type UserPayload = {
  username: string;
  password?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role?: "admin" | "staff";
  active?: boolean;
};

export function useSaveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: UserPayload }) =>
      (id ? await api.put(`/users/${id}`, payload) : await api.post("/users", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: async ({ id, new_password }: { id: string; new_password: string }) =>
      (await api.patch(`/users/${id}/password`, { new_password })).data,
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

/* --------------------------------- settings -------------------------------- */

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<Settings> => (await api.get("/settings")).data,
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Settings>) => (await api.put("/settings", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
