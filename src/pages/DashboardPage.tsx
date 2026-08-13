import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Clock,
  FileText,
  Plus,
  ShoppingCart,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoices, useOrders } from "@/lib/data";
import { flattenExpenses } from "@/lib/derive";
import { formatDate, formatPKR, monthKey, toNum } from "@/lib/format";


const CHART_COLORS = ["#000096", "#3b46c4", "#16a34a", "#d97706", "#dc2626"];

export default function DashboardPage() {
  const orders = useOrders();
  const invoices = useInvoices();
  const loading = orders.isLoading || invoices.isLoading;

  // Expenses live inside orders now, so flatten them once and reuse.
  const expenseRows = useMemo(() => flattenExpenses(orders.data ?? []), [orders.data]);

  const stats = useMemo(() => {
    const orderRows = orders.data ?? [];
    const invoiceRows = invoices.data ?? [];
    const totalOrderAmount = orderRows.reduce((s, o) => s + toNum(o.total_amount), 0);
    const totalExpenses = expenseRows.reduce((s, e) => s + toNum(e.amount), 0);
    const totalTax = orderRows.reduce((s, o) => s + toNum(o.tax), 0);
    return {
      totalOrderAmount,
      totalExpenses,
      totalProfit: totalOrderAmount - totalExpenses,
      totalTax,
      totalOrders: orderRows.length,
      totalInvoices: invoiceRows.length,
      approved: invoiceRows.filter((i) => i.status === "Approved").length,
      pending: invoiceRows.filter((i) => i.status === "Pending").length,
      declined: invoiceRows.filter((i) => i.status === "Declined").length,
    };
  }, [orders.data, expenseRows, invoices.data]);

  const monthly = useMemo(() => {
    const map = new Map<string, { key: string; label: string; amount: number; expenses: number }>();
    const ensure = (date: string) => {
      const key = monthKey(date);
      if (!key) return null;
      if (!map.has(key)) {
        const d = new Date(date);
        map.set(key, {
          key,
          label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          amount: 0,
          expenses: 0,
        });
      }
      return map.get(key)!;
    };
    (orders.data ?? []).forEach((o) => {
      const row = ensure(o.order_date);
      if (row) row.amount += toNum(o.total_amount);
    });
    expenseRows.forEach((e) => {
      const row = ensure(e.expense_date);
      if (row) row.expenses += toNum(e.amount);
    });
    return [...map.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((r) => ({ ...r, profit: r.amount - r.expenses }));
  }, [orders.data, expenseRows]);

  const byService = useMemo(() => {
    const map = new Map<string, number>();
    (orders.data ?? []).forEach((o) =>
      map.set(o.service, (map.get(o.service) ?? 0) + toNum(o.total_amount)),
    );
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [orders.data]);

  const statusData = [
    { name: "Approved", value: stats.approved },
    { name: "Pending", value: stats.pending },
    { name: "Declined", value: stats.declined },
  ].filter((d) => d.value > 0);


  return (
    <AppShell
      title="Executive Dashboard"
      breadcrumb={["CGS Finance", "Dashboard"]}
      description="Live figures calculated from your orders, expenses and invoices"
      actions={
        <>
          <Button asChild>
            <Link to="/invoices/new">
              <Plus className="mr-1.5 h-4 w-4" /> Create Invoice
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/orders/new">
              <Plus className="mr-1.5 h-4 w-4" /> Add Order
            </Link>
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Order Amount"
              value={formatPKR(stats.totalOrderAmount)}
              icon={ShoppingCart}
              tone="primary"
              hint={`${stats.totalOrders} orders recorded`}
            />
            <StatCard
              label="Total Expenses"
              value={formatPKR(stats.totalExpenses)}
              icon={Wallet}
              tone="destructive"
              hint={`${expenseRows.length} expense entries`}
            />
            <StatCard
              label="Total Profit"
              value={formatPKR(stats.totalProfit)}
              icon={TrendingUp}
              tone="success"
              hint="Order amount − expenses"
            />
            <StatCard
              label="Total Invoices"
              value={String(stats.totalInvoices)}
              icon={FileText}
              hint={`Total tax on orders ${formatPKR(stats.totalTax)}`}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Approved Invoices"
              value={String(stats.approved)}
              icon={BadgeCheck}
              tone="success"
            />
            <StatCard
              label="Pending Invoices"
              value={String(stats.pending)}
              icon={Clock}
              tone="warning"
            />
            <StatCard
              label="Declined Invoices"
              value={String(stats.declined)}
              icon={XCircle}
              tone="destructive"
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Monthly Order Amount vs Expenses
              </h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e8f2" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                    />
                    <Tooltip formatter={(v) => formatPKR(v as number)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="amount"
                      name="Order Amount"
                      fill="#000096"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar dataKey="expenses" name="Expenses" fill="#9aa0d8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Invoice Status
              </h3>
              <div className="mt-4 h-72">
                {statusData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                      >
                        {statusData.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={
                              entry.name === "Approved"
                                ? "#16a34a"
                                : entry.name === "Pending"
                                  ? "#d97706"
                                  : "#dc2626"
                            }
                            stroke="none"
                            data-index={i}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="pt-16 text-center text-sm text-muted-foreground">No invoices yet</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Monthly Profit Trend
              </h3>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e8f2" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                    />
                    <Tooltip formatter={(v) => formatPKR(v as number)} />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      name="Profit"
                      stroke="#000096"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Orders by Service
              </h3>
              <div className="mt-4 h-64">
                {byService.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byService} dataKey="value" nameKey="name" outerRadius={85}>
                        {byService.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatPKR(v as number)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="pt-16 text-center text-sm text-muted-foreground">No orders yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Recent Invoices
                </h3>
                <Link to="/invoices" className="text-xs font-semibold text-primary hover:underline">
                  View all
                </Link>
              </div>
              <ul className="mt-3 divide-y divide-border">
                {(invoices.data ?? []).slice(0, 5).map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="truncate text-sm font-semibold text-foreground hover:text-primary"
                      >
                        {inv.invoice_number}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {inv.to_company || "—"} · {formatDate(inv.invoice_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="num text-sm font-semibold">{formatPKR(inv.grand_total)}</p>
                      <StatusBadge status={inv.status} className="mt-1" />
                    </div>
                  </li>
                ))}
                {!(invoices.data ?? []).length && (
                  <li className="py-6 text-center text-sm text-muted-foreground">
                    No invoices yet
                  </li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Recent Orders
                </h3>
                <Link to="/orders" className="text-xs font-semibold text-primary hover:underline">
                  View all
                </Link>
              </div>
              <ul className="mt-3 divide-y divide-border">
                {(orders.data ?? []).slice(0, 5).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {o.order_code}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.details || "—"} · {formatDate(o.order_date)}
                      </p>
                    </div>
                    <p className="num shrink-0 text-sm font-semibold">
                      {formatPKR(o.total_amount)}
                    </p>
                  </li>
                ))}
                {!(orders.data ?? []).length && (
                  <li className="py-6 text-center text-sm text-muted-foreground">No orders yet</li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Recent Expenses
                </h3>
                <Link to="/orders" className="text-xs font-semibold text-primary hover:underline">
                  View all
                </Link>
              </div>
              <ul className="mt-3 divide-y divide-border">
                {expenseRows.slice(0, 5).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {e.description || e.category}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.category} ·{" "}
                        {e.order_code}
                      </p>
                    </div>
                    <p className="num shrink-0 text-sm font-semibold text-destructive">
                      {formatPKR(e.amount)}
                    </p>
                  </li>
                ))}
                {!expenseRows.length && (
                  <li className="py-6 text-center text-sm text-muted-foreground">
                    No expenses yet
                  </li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
