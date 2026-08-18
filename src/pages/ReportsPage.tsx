
import {
  Download,
  FileSpreadsheet,
  FileText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SERVICES } from "@/lib/cgs";
import { useInvoices, useOrders } from "@/lib/data";
import { flattenExpenses } from "@/lib/derive";
import { exportCSV, exportExcel } from "@/lib/export";
import { formatPKR, monthKey } from "@/lib/format";
import { exportTablePdf } from "@/lib/pdf-lazy";


const CHART_COLORS = ["#000096", "#3b3bdb", "#7c7cf0", "#16a34a", "#f59e0b", "#dc2626"];

export default function ReportsPage() {
  const { data: orders = [] } = useOrders();
  // Expenses are embedded in orders, so flatten them for category/monthly views.
  const expenses = useMemo(() => flattenExpenses(orders), [orders]);
  const { data: invoices = [] } = useInvoices();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [service, setService] = useState("all");

  const inRange = useCallback(
    (date: string) => {
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    },
    [from, to],
  );

  const filteredOrders = useMemo(
    () =>
      orders.filter((o) => inRange(o.order_date) && (service === "all" || o.service === service)),
    [orders, inRange, service],
  );

  const orderIds = useMemo(() => new Set(filteredOrders.map((o) => o.id)), [filteredOrders]);

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((e) => {
        if (!inRange(e.expense_date)) return false;
        if (service !== "all") return orderIds.has(e.order_id);
        return true;
      }),
    [expenses, inRange, service, orderIds],
  );

  const filteredInvoices = useMemo(
    () =>
      invoices.filter(
        (i) => inRange(i.invoice_date) && (service === "all" || i.service === service),
      ),
    [invoices, inRange, service],
  );

  const revenue = filteredOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
  const tax = filteredOrders.reduce((s, o) => s + Number(o.tax ?? 0), 0);
  const spend = filteredExpenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  // Profit = Revenue − Expenses − Tax (tax is passed through to the government).
  const profit = revenue - spend - tax;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const invoiced = filteredInvoices.reduce((s, i) => s + Number(i.grand_total ?? 0), 0);

  const monthly = useMemo(() => {
    const map = new Map<
      string,
      { month: string; revenue: number; expense: number; tax: number; profit: number }
    >();
    const ensure = (key: string) => {
      if (!map.has(key)) map.set(key, { month: key, revenue: 0, expense: 0, tax: 0, profit: 0 });
      return map.get(key)!;
    };
    for (const o of filteredOrders) {
      const row = ensure(monthKey(o.order_date));
      row.revenue += Number(o.total_amount ?? 0);
      row.tax += Number(o.tax ?? 0);
    }
    for (const e of filteredExpenses)
      ensure(monthKey(e.expense_date)).expense += Number(e.amount ?? 0);
    for (const row of map.values()) row.profit = row.revenue - row.expense - row.tax;
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredOrders, filteredExpenses]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredExpenses)
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount ?? 0));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const byService = useMemo(
    () =>
      SERVICES.map((s) => {
        const rows = filteredOrders.filter((o) => o.service === s);
        const rev = rows.reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);
        const svcTax = rows.reduce((sum, o) => sum + Number(o.tax ?? 0), 0);
        const ids = new Set(rows.map((o) => o.id));
        const exp = filteredExpenses
          .filter((e) => ids.has(e.order_id))
          .reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
        return {
          service: s,
          orders: rows.length,
          revenue: rev,
          expense: exp,
          profit: rev - exp - svcTax,
        };
      }),
    [filteredOrders, filteredExpenses],
  );

  const exportRows = () =>
    monthly.map((m) => ({
      Month: m.month,
      Revenue: m.revenue,
      Expenses: m.expense,
      Profit: m.profit,
    }));

  return (
    <AppShell
      title="Reports"
      breadcrumb={["CGS Finance", "Reports"]}
      description="Profit & loss across orders, expenses and invoices"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => exportCSV(exportRows(), "cgs-report")}>
            <FileText className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportExcel(exportRows(), "cgs-report")}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button
            size="sm"
            onClick={() =>
              exportTablePdf({
                title: "Profit & Loss Report",
                subtitle: `CGS Finance System${service === "all" ? "" : ` · ${service}`}`,
                columns: ["Month", "Revenue", "Expenses", "Profit"],
                rows: monthly.map((m) => [
                  m.month,
                  formatPKR(m.revenue),
                  formatPKR(m.expense),
                  formatPKR(m.profit),
                ]),
                summary: [
                  ["Revenue", formatPKR(revenue)],
                  ["Expenses", formatPKR(spend)],
                  ["Profit", formatPKR(profit)],
                  ["Margin", `${margin.toFixed(1)}%`],
                ],
                filename: "cgs-profit-loss",
              })
            }
          >
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="space-y-1.5">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Service</Label>
          <Select value={service} onValueChange={setService}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue />
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
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setFrom("");
            setTo("");
            setService("all");
          }}
        >
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Gross Revenue"
          value={formatPKR(revenue)}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Total Expenses"
          value={formatPKR(spend)}
          icon={TrendingDown}
          tone="destructive"
        />
        <StatCard
          label="Net Profit"
          value={formatPKR(profit)}
          icon={Wallet}
          tone={profit >= 0 ? "success" : "destructive"}
          hint={`Margin ${margin.toFixed(1)}%`}
        />
        <StatCard label="Invoiced Amount" value={formatPKR(invoiced)} icon={FileText} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3 [&>*]:min-w-0">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card xl:col-span-2">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-primary">
            Revenue vs Expenses
          </h2>
          <div className="h-64 w-full min-w-0 overflow-hidden sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => formatPKR(v as number)} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#000096" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-primary">
            Expenses by Category
          </h2>
          <div className="h-64 w-full min-w-0 overflow-hidden sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                >
                  {byCategory.map((entry, i) => (
                    <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatPKR(v as number)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-primary">
            Profit Trend
          </h2>
          <div className="h-56 w-full min-w-0 overflow-hidden sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => formatPKR(v as number)} />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#000096"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-accent/60 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Service</th>
                <th className="px-4 py-3 text-right font-semibold">Orders</th>
                <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                <th className="px-4 py-3 text-right font-semibold">Expenses</th>
                <th className="px-4 py-3 text-right font-semibold">Profit</th>
              </tr>
            </thead>
            <tbody>
              {byService.map((row) => (
                <tr key={row.service} className="border-t border-border/70">
                  <td className="px-4 py-3 font-medium">{row.service}</td>
                  <td className="stat-figure px-4 py-3 text-right">{row.orders}</td>
                  <td className="stat-figure px-4 py-3 text-right">{formatPKR(row.revenue)}</td>
                  <td className="stat-figure px-4 py-3 text-right text-muted-foreground">
                    {formatPKR(row.expense)}
                  </td>
                  <td
                    className={`stat-figure px-4 py-3 text-right font-semibold ${
                      row.profit >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatPKR(row.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
