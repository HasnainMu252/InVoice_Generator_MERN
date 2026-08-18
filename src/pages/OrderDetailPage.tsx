import { ArrowLeft, Download, Pencil } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrder, useSettings } from "@/lib/data";
import { formatDate, formatPKR } from "@/lib/format";
import { downloadOrderPdf } from "@/lib/pdf-lazy";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/70 py-2 text-sm last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useOrder(id);
  const settings = useSettings();

  return (
    <AppShell
      title={order ? order.order_code : "Order"}
      breadcrumb={["CGS Finance", "Orders", "Detail"]}
      description={order?.company || undefined}
      actions={
        order ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadOrderPdf(order, settings.data ?? null).catch(() =>
                  toast.error("Could not generate the PDF"),
                )
              }
            >
              <Download className="mr-1.5 h-4 w-4" /> Download PDF
            </Button>
            <Button size="sm" asChild>
              <Link to={`/orders/${order.id}/edit`}>
                <Pencil className="mr-1.5 h-4 w-4" /> Edit
              </Link>
            </Button>
          </>
        ) : null
      }
    >
      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : !order ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <p className="text-muted-foreground">This order no longer exists.</p>
          <Button asChild className="mt-4">
            <Link to="/orders">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to orders
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-primary">
                Order Information
              </h2>
              <Row label="Order Code" value={order.order_code} />
              <Row label="Order Date" value={formatDate(order.order_date)} />
              <Row label="Month" value={order.month} />
              <Row label="Service" value={order.service} />
              <Row label="Company" value={order.company} />
              <Row label="Person Name" value={order.contact_person} />
              <Row label="Contact Number" value={order.contact_number} />
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-primary">
                Details
              </h2>
              <p className="whitespace-pre-line text-sm text-foreground">{order.details || "—"}</p>
              {order.notes?.trim() ? (
                <>
                  <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Notes
                  </h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                    {order.notes}
                  </p>
                </>
              ) : null}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-primary">
                Purchasing &amp; Expense Breakdown
              </h2>
              {order.expenses?.length ? (
                <div className="space-y-2">
                  {order.expenses.map((e, i) => (
                    <div
                      key={e.id ?? i}
                      className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{e.description || "—"}</p>
                        <p className="text-xs text-muted-foreground">{e.category}</p>
                      </div>
                      <span className="stat-figure shrink-0 text-sm font-semibold text-destructive">
                        {formatPKR(e.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No expenses recorded for this order.
                </p>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-primary">
                Summary
              </h2>
              <Row label="Total Order Amount" value={formatPKR(order.total_amount)} />
              <Row label="Less: Total Expense" value={`−${formatPKR(order.expense_total)}`} />
              <Row label="Less: Tax" value={`−${formatPKR(order.tax)}`} />
              <div className="mt-3 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
                <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                  Total Profit
                </span>
                <span className="stat-figure text-lg font-bold">{formatPKR(order.profit)}</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
