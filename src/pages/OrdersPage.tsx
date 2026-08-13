import { Link, useNavigate } from "react-router-dom";
import { Download, FileSpreadsheet, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SERVICES } from "@/lib/cgs";
import { useDeleteOrder, useOrders } from "@/lib/data";
import { exportCSV, exportExcel } from "@/lib/export";
import { formatDate, formatPKR } from "@/lib/format";
import { exportTablePdf } from "@/lib/pdf";


export default function OrdersPage() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useOrders();
  const remove = useDeleteOrder();

  const [q, setQ] = useState("");
  const [service, setService] = useState("all");
  const [month, setMonth] = useState("all");

  const months = useMemo(
    () => Array.from(new Set(orders.map((o) => o.month).filter(Boolean))),
    [orders],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (service !== "all" && o.service !== service) return false;
      if (month !== "all" && o.month !== month) return false;
      if (!term) return true;
      return [o.order_code, o.details, o.contact_person, o.contact_number]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [orders, q, service, month]);

  const totals = rows.reduce(
    (acc, o) => {
      const expense = o.expense_total;
      acc.revenue += Number(o.total_amount ?? 0);
      acc.expense += expense;
      acc.profit += o.profit;
      return acc;
    },
    { revenue: 0, expense: 0, profit: 0 },
  );

  const exportRows = () =>
    rows.map((o) => {
      const expense = o.expense_total;
      return {
        "Order Code": o.order_code,
        Date: o.order_date,
        Month: o.month,
        Details: o.details,
        "Contact Person": o.contact_person,
        "Contact Number": o.contact_number,
        Service: o.service,
        "Total Amount": o.total_amount,
        Tax: o.tax,
        "Total Expense Amount": expense,
        "Total Profit Amount": o.profit,
      };
    });

  return (
    <AppShell
      title="All Orders"
      breadcrumb={["CGS Finance", "Orders"]}
      description={`${rows.length} order(s) · Profit ${formatPKR(totals.profit)}`}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => exportCSV(exportRows(), "cgs-orders")}>
            <FileText className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportExcel(exportRows(), "cgs-orders")}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportTablePdf({
                title: "Order Register",
                subtitle: "CGS Finance System",
                columns: ["Order", "Date", "Details", "Service", "Amount", "Expense", "Profit"],
                rows: rows.map((o) => {
                  const expense = o.expense_total;
                  return [
                    o.order_code,
                    formatDate(o.order_date),
                    o.details.slice(0, 48),
                    o.service,
                    formatPKR(o.total_amount),
                    formatPKR(expense),
                    formatPKR(o.profit),
                  ];
                }),
                summary: [
                  ["Orders", String(rows.length)],
                  ["Revenue", formatPKR(totals.revenue)],
                  ["Expenses", formatPKR(totals.expense)],
                  ["Profit", formatPKR(totals.profit)],
                ],
                filename: "cgs-orders",
                landscape: true,
              })
            }
          >
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button size="sm" onClick={() => navigate("/orders/new")}>
            <Plus className="mr-2 h-4 w-4" /> Add Order
          </Button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order code, details, contact…"
            className="pl-9"
          />
        </div>
        <Select value={service} onValueChange={setService}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            {SERVICES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-accent/60 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Order</th>
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Details</th>
              <th className="px-4 py-3 text-left font-semibold">Contact</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 text-right font-semibold">Tax</th>
              <th className="px-4 py-3 text-right font-semibold">Expense</th>
              <th className="px-4 py-3 text-right font-semibold">Profit</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                  Loading orders…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                  No orders match your filters.
                </td>
              </tr>
            ) : (
              rows.map((o) => {
                const expense = o.expense_total;
                const profit = o.profit;
                return (
                  <tr key={o.id} className="border-t border-border/70 hover:bg-accent/40">
                    <td className="px-4 py-3 font-semibold text-primary">{o.order_code}</td>
                    <td className="px-4 py-3">
                      <div>{formatDate(o.order_date)}</div>
                      <div className="text-xs text-muted-foreground">{o.month}</div>
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <div className="truncate font-medium">{o.details}</div>
                      <div className="text-xs text-muted-foreground">{o.service}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{o.contact_person || "—"}</div>
                      <div className="text-xs text-muted-foreground">{o.contact_number}</div>
                    </td>
                    <td className="stat-figure px-4 py-3 text-right">
                      {formatPKR(o.total_amount)}
                    </td>
                    <td className="stat-figure px-4 py-3 text-right text-muted-foreground">
                      {formatPKR(o.tax)}
                    </td>
                    <td className="stat-figure px-4 py-3 text-right text-muted-foreground">
                      {formatPKR(expense)}
                    </td>
                    <td
                      className={`stat-figure px-4 py-3 text-right font-semibold ${
                        profit >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatPKR(profit)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" title="Edit">
                          <Link to={`/orders/${o.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          className="text-destructive"
                          onClick={() => {
                            if (!confirm(`Delete order ${o.order_code}?`)) return;
                            remove.mutate(o.id, {
                              onSuccess: () => toast.success("Order deleted"),
                              onError: () => toast.error("Delete failed"),
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
