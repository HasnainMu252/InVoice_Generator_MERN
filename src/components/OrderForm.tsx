import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { EXPENSE_CATEGORIES, SERVICES } from "@/lib/cgs";
import { apiMessage } from "@/lib/api";
import { nextOrderCode, useSaveOrder, type Order, type OrderExpenseLine } from "@/lib/data";
import { formatPKR, monthLabel, toNum } from "@/lib/format";

const today = () => new Date().toISOString().slice(0, 10);

type ExpenseRow = { id: string; category: string; description: string; amount: string };

let rowSeq = 0;
const newRow = (): ExpenseRow => ({
  id: `row-${(rowSeq += 1)}`,
  category: "Production",
  description: "",
  amount: "",
});

export function OrderForm({ existing }: { existing?: Order }) {
  const navigate = useNavigate();
  const save = useSaveOrder();
  // Expenses are embedded in the order document, so they arrive with it —
  // no second request needed.
  const loadingExpenses = false;

  const [draft, setDraft] = useState(() => ({
    order_code: existing?.order_code ?? "",
    order_date: existing?.order_date ?? today(),
    details: existing?.details ?? "",
    contact_person: existing?.contact_person ?? "",
    contact_number: existing?.contact_number ?? "",
    total_amount: String(existing?.total_amount ?? ""),
    tax: String(existing?.tax ?? ""),
    service: existing?.service ?? SERVICES[0],
    notes: existing?.notes ?? "",
  }));

  const [rows, setRows] = useState<ExpenseRow[]>(() =>
    existing?.expenses?.length
      ? existing.expenses.map((e) => ({
          id: e.id ?? `row-${(rowSeq += 1)}`,
          category: e.category,
          description: e.description,
          amount: String(e.amount ?? ""),
        }))
      : [newRow()],
  );

  useEffect(() => {
    if (existing) return;
    nextOrderCode()
      .then((code) => setDraft((d) => (d.order_code ? d : { ...d, order_code: code })))
      .catch(() => undefined);
  }, [existing]);

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setRow = (id: string, patch: Partial<ExpenseRow>) =>
    setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const totalExpense = useMemo(() => rows.reduce((sum, r) => sum + toNum(r.amount), 0), [rows]);

  const totalProfit = useMemo(
    () => toNum(draft.total_amount) - totalExpense,
    [draft.total_amount, totalExpense],
  );

  const submit = async () => {
    if (!draft.order_code.trim()) {
      toast.error("Order code is required");
      return;
    }
    if (!draft.details.trim()) {
      toast.error("Order details are required");
      return;
    }
    const payload = {
      order_code: draft.order_code.trim(),
      order_date: draft.order_date || today(),
      details: draft.details,
      contact_person: draft.contact_person,
      contact_number: draft.contact_number,
      total_amount: toNum(draft.total_amount),
      tax: toNum(draft.tax),
      month: monthLabel(draft.order_date || today()),
      service: draft.service,
      notes: draft.notes,
    };
    const expenses: OrderExpenseLine[] = rows.map((r) => ({
      category: r.category,
      description: r.description.trim(),
      amount: toNum(r.amount),
    }));
    try {
      await save.mutateAsync(
        existing?.id
          ? { id: existing.id, payload: { ...payload, expenses } }
          : { payload: { ...payload, expenses } },
      );
      toast.success(existing ? "Order updated" : "Order added");
      navigate("/orders");
    } catch (error) {
      toast.error(apiMessage(error, "Could not save the order"));
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-primary">
            Order Information
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Order Code</Label>
              <Input
                value={draft.order_code}
                onChange={(e) => set("order_code", e.target.value)}
                placeholder="CGS-ORD-0001"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Order Date</Label>
              <Input
                type="date"
                value={draft.order_date}
                onChange={(e) => set("order_date", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Order Details</Label>
              <Textarea
                rows={3}
                value={draft.details}
                onChange={(e) => set("details", e.target.value)}
                placeholder="Corporate gift boxes for annual conference…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person</Label>
              <Input
                value={draft.contact_person}
                onChange={(e) => set("contact_person", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Number</Label>
              <Input
                value={draft.contact_number}
                onChange={(e) => set("contact_number", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Service</Label>
              <Select value={draft.service} onValueChange={(v) => set("service", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Input readOnly value={monthLabel(draft.order_date || today())} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Order Amount (PKR)</Label>
              <Input
                inputMode="decimal"
                value={draft.total_amount}
                onChange={(e) => set("total_amount", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tax (PKR)</Label>
              <Input
                inputMode="decimal"
                value={draft.tax}
                onChange={(e) => set("tax", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Total Expense Amount (PKR)</Label>
              <Input
                readOnly
                value={formatPKR(totalExpense)}
                className="bg-muted/50 font-semibold"
              />
              <p className="text-[11px] text-muted-foreground">
                Auto-calculated from the expense breakdown below.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Total Profit Amount (PKR)</Label>
              <Input
                readOnly
                value={formatPKR(totalProfit)}
                className={`bg-muted/50 font-semibold ${
                  totalProfit < 0 ? "text-destructive" : "text-success"
                }`}
              />
              <p className="text-[11px] text-muted-foreground">
                Total Order Amount − Total Expense Amount.
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-primary">
                Purchasing &amp; Expense Breakdown
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Every expense for this order is recorded here — printing, packaging, delivery,
                production and so on.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((list) => [...list, newRow()])}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Expense
            </Button>
          </div>

          {loadingExpenses ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading expenses…</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className="grid gap-3 rounded-xl border border-border/70 bg-background/60 p-3 sm:grid-cols-[minmax(0,150px)_minmax(0,1fr)_minmax(0,140px)_auto]"
                >
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Category
                    </Label>
                    <Select
                      value={row.category}
                      onValueChange={(v) => setRow(row.id, { category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Description
                    </Label>
                    <Input
                      value={row.description}
                      onChange={(e) => setRow(row.id, { description: e.target.value })}
                      placeholder="Branded printing, courier, packaging…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Amount (PKR)
                    </Label>
                    <Input
                      inputMode="decimal"
                      value={row.amount}
                      onChange={(e) => setRow(row.id, { amount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Remove expense"
                      className="text-destructive"
                      disabled={rows.length === 1}
                      onClick={() =>
                        setRows((list) =>
                          list.length === 1 ? list : list.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between rounded-xl bg-accent/60 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Total Expense
            </span>
            <span className="stat-figure text-base font-bold">{formatPKR(totalExpense)}</span>
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-primary">
            Summary
          </h2>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-muted-foreground">Total Order Amount</span>
            <span className="stat-figure font-semibold">{formatPKR(draft.total_amount)}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-muted-foreground">Total Expense</span>
            <span className="stat-figure font-semibold text-destructive">
              {formatPKR(totalExpense)}
            </span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="stat-figure font-semibold">{formatPKR(draft.tax)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">Total Profit</span>
            <span className="stat-figure text-lg font-bold">{formatPKR(totalProfit)}</span>
          </div>
        </div>

        <Button className="w-full" onClick={submit} disabled={save.isPending}>
          {save.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {existing ? "Update Order" : "Save Order"}
        </Button>
      </aside>
    </div>
  );
}
