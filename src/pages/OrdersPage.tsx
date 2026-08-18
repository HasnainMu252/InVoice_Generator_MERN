import { Download, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { BulkBar } from "@/components/BulkBar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SERVICES } from "@/lib/cgs";
import {
  useDeleteAllOrders,
  useDeleteOrder,
  useImportOrders,
  useOrders,
  useSettings,
  type Order,
} from "@/lib/data";
import { formatDate, formatPKR } from "@/lib/format";
import { downloadOrderPdf } from "@/lib/pdf-lazy";
import {
  downloadOrderTemplate,
  exportOrdersWorkbook,
  parseOrdersWorkbook,
} from "@/lib/workbook";

export default function OrdersPage() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useOrders();
  const settings = useSettings();
  const remove = useDeleteOrder();
  const removeAll = useDeleteAllOrders();
  const importOrders = useImportOrders();

  const [q, setQ] = useState("");
  const [service, setService] = useState("all");
  const [month, setMonth] = useState("all");
  const [deleting, setDeleting] = useState<Order | null>(null);

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
      return [o.order_code, o.details, o.company, o.contact_person, o.contact_number]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [orders, q, service, month]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, o) => {
          acc.revenue += Number(o.total_amount ?? 0);
          acc.expense += o.expense_total;
          acc.profit += o.profit;
          return acc;
        },
        { revenue: 0, expense: 0, profit: 0 },
      ),
    [rows],
  );

  const savePdf = (order: Order) =>
    downloadOrderPdf(order, settings.data ?? null).catch(() =>
      toast.error("Could not generate the PDF"),
    );

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting!.id);
      toast.success(`Deleted ${deleting!.order_code}`);
      setDeleting(null);
    } catch {
      toast.error("Could not delete the order");
    }
  };

  return (
    <AppShell
      title="All Orders"
      breadcrumb={["CGS Finance", "Orders"]}
      description={`${rows.length} order(s) · Profit ${formatPKR(totals.profit)}`}
      actions={
        <Button size="sm" onClick={() => navigate("/orders/new")}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Order
        </Button>
      }
    >
      <div className="mb-4 grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Revenue" value={formatPKR(totals.revenue)} />
        <StatCard label="Expenses" value={formatPKR(totals.expense)} tone="destructive" />
        <StatCard label="Profit" value={formatPKR(totals.profit)} tone="success" />
      </div>

      <BulkBar
        entity="orders"
        count={orders.length}
        onExport={() => exportOrdersWorkbook(orders)}
        onTemplate={downloadOrderTemplate}
        onParse={(file) => parseOrdersWorkbook(file)}
        onImport={(r, mode) => importOrders.mutateAsync({ rows: r, mode })}
        onDeleteAll={() => removeAll.mutateAsync()}
        deleting={removeAll.isPending}
      />

      <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-3 shadow-card sm:flex sm:flex-wrap sm:p-4">
        <div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order, company, person…"
            className="pl-9"
          />
        </div>
        <Select value={service} onValueChange={setService}>
          <SelectTrigger className="w-full sm:w-[220px]">
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
          <SelectTrigger className="w-full sm:w-[190px]">
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

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : !rows.length ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <p className="text-sm text-muted-foreground">
            {orders.length ? "No orders match those filters." : "No orders yet."}
          </p>
          <Button className="mt-4" onClick={() => navigate("/orders/new")}>
            <Plus className="mr-2 h-4 w-4" /> Add your first order
          </Button>
        </div>
      ) : (
        <>
          {/* Phone: one card per order — no sideways scrolling. */}
          <div className="space-y-3 lg:hidden">
            {rows.map((o) => (
              <div key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/orders/${o.id}`}
                      className="font-bold text-primary hover:underline"
                    >
                      {o.order_code}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(o.order_date)} · {o.service}
                    </p>
                  </div>
                  <span className="stat-figure shrink-0 text-sm font-bold">
                    {formatPKR(o.total_amount)}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-foreground">{o.details}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {o.company || "—"}
                  {o.contact_person ? ` · ${o.contact_person}` : ""}
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-accent/40 p-2.5 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tax</p>
                    <p className="stat-figure text-xs font-semibold">{formatPKR(o.tax)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Expense
                    </p>
                    <p className="stat-figure text-xs font-semibold text-destructive">
                      {formatPKR(o.expense_total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Profit
                    </p>
                    <p
                      className={`stat-figure text-xs font-bold ${
                        o.profit >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatPKR(o.profit)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <Link to={`/orders/${o.id}`}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => savePdf(o)}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/orders/${o.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setDeleting(o)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card shadow-card lg:block">
            <table className="w-full text-sm">
              <thead className="bg-accent/50 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Order</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Details</th>
                  <th className="px-4 py-3 text-left font-semibold">Client</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-right font-semibold">Tax</th>
                  <th className="px-4 py-3 text-right font-semibold">Expense</th>
                  <th className="px-4 py-3 text-right font-semibold">Profit</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <Link
                        to={`/orders/${o.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {o.order_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>{formatDate(o.order_date)}</div>
                      <div className="text-xs text-muted-foreground">{o.month}</div>
                    </td>
                    <td className="max-w-[240px] px-4 py-3">
                      <div className="truncate font-medium">{o.details}</div>
                      <div className="text-xs text-muted-foreground">{o.service}</div>
                    </td>
                    <td className="max-w-[180px] px-4 py-3">
                      <div className="truncate font-medium">{o.company || "—"}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[o.contact_person, o.contact_number].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </td>
                    <td className="stat-figure px-4 py-3 text-right">
                      {formatPKR(o.total_amount)}
                    </td>
                    <td className="stat-figure px-4 py-3 text-right text-muted-foreground">
                      {formatPKR(o.tax)}
                    </td>
                    <td className="stat-figure px-4 py-3 text-right text-muted-foreground">
                      {formatPKR(o.expense_total)}
                    </td>
                    <td
                      className={`stat-figure px-4 py-3 text-right font-semibold ${
                        o.profit >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatPKR(o.profit)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" title="View" asChild>
                          <Link to={`/orders/${o.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Download PDF"
                          onClick={() => savePdf(o)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Edit" asChild>
                          <Link to={`/orders/${o.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Delete"
                          className="text-destructive"
                          onClick={() => setDeleting(o)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.order_code}?`}
        description="This order and its expense breakdown will be permanently removed."
        confirmLabel="Delete Order"
        pending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </AppShell>
  );
}
