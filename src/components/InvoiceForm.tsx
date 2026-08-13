import { useNavigate } from "react-router-dom";
import { Download, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { SERVICES } from "@/lib/cgs";
import {
  nextInvoiceNumber,
  useSaveInvoice,
  useSettings,
  type Invoice,
  type InvoiceItem,
} from "@/lib/data";
import { apiMessage } from "@/lib/api";
import { amountInWords, formatPKR, toNum } from "@/lib/format";
import { downloadInvoicePdf } from "@/lib/pdf";

type Draft = {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
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
  delivery_charges: string;
  other_charges: string;
  with_tax: boolean;
  tax_rate: string;
  notes: string;
};

type ItemDraft = { description: string; qty: string; unit_price: string };

const today = () => new Date().toISOString().slice(0, 10);

function Section({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6 ${className ?? ""}`}
    >
      <div className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-primary">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function InvoiceForm({ existing }: { existing?: Invoice }) {
  const navigate = useNavigate();
  const settings = useSettings();
  const save = useSaveInvoice();
  const [numberReady, setNumberReady] = useState(Boolean(existing));

  const [draft, setDraft] = useState<Draft>(() => ({
    invoice_number: existing?.invoice_number ?? "",
    invoice_date: existing?.invoice_date ?? today(),
    due_date: existing?.due_date ?? "",
    status: existing?.status ?? "Pending",
    service: existing?.service ?? SERVICES[0],
    from_company: existing?.from_company ?? "CORPORATE GIFTING SOLUTION",
    from_ntn: existing?.from_ntn ?? "I230509-1",
    from_website: existing?.from_website ?? "www.corporategiftingsolution.com",
    from_phone: existing?.from_phone ?? "+92 321 3121865",
    from_email: existing?.from_email ?? "contact@corporategiftingsolution.com",
    to_contact_person: existing?.to_contact_person ?? "",
    to_company: existing?.to_company ?? "",
    to_phone: existing?.to_phone ?? "",
    to_email: existing?.to_email ?? "",
    to_address: existing?.to_address ?? "",
    to_ntn: existing?.to_ntn ?? "",
    delivery_charges: String(toNum(existing?.delivery_charges) || ""),
    other_charges: String(toNum(existing?.other_charges) || ""),
    with_tax: existing?.with_tax ?? false,
    tax_rate: String(toNum(existing?.tax_rate) || 18),
    notes: existing?.notes ?? "",
  }));

  const [items, setItems] = useState<ItemDraft[]>(() =>
    existing?.invoice_items?.length
      ? existing.invoice_items
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((it) => ({
            description: it.description,
            qty: String(toNum(it.qty)),
            unit_price: String(toNum(it.unit_price)),
          }))
      : [{ description: "", qty: "1", unit_price: "" }],
  );

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // Pre-fill from company settings for new invoices.
  useEffect(() => {
    if (existing || !settings.data) return;
    const s = settings.data;
    setDraft((d) => ({
      ...d,
      from_company: s.company_name,
      from_ntn: s.ntn,
      from_website: s.website,
      from_phone: s.phone,
      from_email: s.email,
      tax_rate: String(toNum(s.default_tax_rate) || 18),
      notes: d.notes || s.default_notes,
    }));
    if (!numberReady) {
      nextInvoiceNumber()
        .then((num) => setDraft((d) => (d.invoice_number ? d : { ...d, invoice_number: num })))
        .finally(() => setNumberReady(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.data, existing]);

  const totals = useMemo(() => {
    const lines = items.map((it) => toNum(it.qty) * toNum(it.unit_price));
    const subtotal = lines.reduce((s, v) => s + v, 0);
    const beforeTax = subtotal + toNum(draft.delivery_charges) + toNum(draft.other_charges);
    const taxRate = draft.with_tax ? toNum(draft.tax_rate) : 0;
    const taxAmount = draft.with_tax ? (beforeTax * taxRate) / 100 : 0;
    return { lines, subtotal, beforeTax, taxRate, taxAmount, grandTotal: beforeTax + taxAmount };
  }, [items, draft.delivery_charges, draft.other_charges, draft.with_tax, draft.tax_rate]);

  const buildPayload = () => ({
    invoice_number: draft.invoice_number.trim(),
    invoice_date: draft.invoice_date,
    due_date: draft.due_date || null,
    status: draft.status,
    service: draft.service,
    from_company: draft.from_company,
    from_ntn: draft.from_ntn,
    from_website: draft.from_website,
    from_phone: draft.from_phone,
    from_email: draft.from_email,
    to_contact_person: draft.to_contact_person,
    to_company: draft.to_company,
    to_phone: draft.to_phone,
    to_email: draft.to_email,
    to_address: draft.to_address,
    to_ntn: draft.to_ntn,
    subtotal: totals.subtotal,
    delivery_charges: toNum(draft.delivery_charges),
    other_charges: toNum(draft.other_charges),
    with_tax: draft.with_tax,
    tax_rate: totals.taxRate,
    tax_amount: totals.taxAmount,
    grand_total: totals.grandTotal,
    notes: draft.notes,
    items: items.map((it, i): InvoiceItem => ({
      sort_order: i + 1,
      description: it.description.trim(),
      qty: toNum(it.qty),
      unit_price: toNum(it.unit_price),
      total: toNum(it.qty) * toNum(it.unit_price),
    })),
  });

  const validate = () => {
    if (!draft.invoice_number.trim()) return "Invoice number is required.";
    if (!draft.invoice_date) return "Invoice date is required.";
    if (!draft.to_company.trim() && !draft.to_contact_person.trim())
      return "Add a customer company or contact person.";
    if (!items.some((it) => it.description.trim() && toNum(it.qty) > 0))
      return "Add at least one invoice item with a description and quantity.";
    return null;
  };

  const submit = async (mode: "save" | "save-download") => {
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      const payload = buildPayload();
      const saved = await save.mutateAsync(
        existing?.id ? { id: existing.id, payload } : { payload },
      );
      toast.success(existing ? "Invoice updated successfully" : "Invoice saved successfully");
      // Render the PDF from the SERVER response, not the local draft, so the
      // printed totals are always the ones that were actually stored.
      if (mode === "save-download") {
        await downloadInvoicePdf(saved, settings.data ?? null);
      }
      navigate(`/invoices/${saved.id}`);
    } catch (error) {
      toast.error(apiMessage(error, "Could not save invoice"));
    }
  };

  return (
    <div className="space-y-5">
      <Section title="Invoice Details">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="invoice_number">Invoice Number</Label>
            <Input
              id="invoice_number"
              value={draft.invoice_number}
              onChange={(e) => set("invoice_number", e.target.value)}
              placeholder="CGS-INV-0001"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invoice_date">Invoice Date</Label>
            <Input
              id="invoice_date"
              type="date"
              value={draft.invoice_date}
              onChange={(e) => set("invoice_date", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due_date">Due Date (optional)</Label>
            <Input
              id="due_date"
              type="date"
              value={draft.due_date}
              onChange={(e) => set("due_date", e.target.value)}
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
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="From" subtitle="Pre-filled from company settings — editable when required">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Company Name</Label>
              <Input
                value={draft.from_company}
                onChange={(e) => set("from_company", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>NTN</Label>
              <Input value={draft.from_ntn} onChange={(e) => set("from_ntn", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input
                value={draft.from_website}
                onChange={(e) => set("from_website", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={draft.from_phone} onChange={(e) => set("from_phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={draft.from_email} onChange={(e) => set("from_email", e.target.value)} />
            </div>
          </div>
        </Section>

        <Section title="Bill To" subtitle="Customer details stored with this invoice">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Contact Person Name</Label>
              <Input
                value={draft.to_contact_person}
                onChange={(e) => set("to_contact_person", e.target.value)}
                placeholder="Ahmed Raza"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input
                value={draft.to_company}
                onChange={(e) => set("to_company", e.target.value)}
                placeholder="Meezan Technologies"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input value={draft.to_phone} onChange={(e) => set("to_phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={draft.to_email} onChange={(e) => set("to_email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>NTN (optional)</Label>
              <Input value={draft.to_ntn} onChange={(e) => set("to_ntn", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Textarea
                rows={2}
                value={draft.to_address}
                onChange={(e) => set("to_address", e.target.value)}
              />
            </div>
          </div>
        </Section>
      </div>

      <Section title="Invoice Items" subtitle="Totals update instantly as you type">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-14 pb-2">S.No</th>
                <th className="pb-2">Items / Description</th>
                <th className="w-24 pb-2 text-right">Qty</th>
                <th className="w-36 pb-2 text-right">Per Unit Price</th>
                <th className="w-36 pb-2 text-right">Total</th>
                <th className="w-12 pb-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-border/60">
                  <td className="py-2 text-muted-foreground">{index + 1}</td>
                  <td className="py-2 pr-2">
                    <Input
                      value={item.description}
                      placeholder="Corporate Gift Box"
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) =>
                            i === index ? { ...it, description: e.target.value } : it,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      className="text-right"
                      value={item.qty}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) => (i === index ? { ...it, qty: e.target.value } : it)),
                        )
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      className="text-right"
                      value={item.unit_price}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) =>
                            i === index ? { ...it, unit_price: e.target.value } : it,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="num py-2 pr-2 text-right font-semibold">
                    {formatPKR(totals.lines[index] ?? 0)}
                  </td>
                  <td className="py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove item"
                      disabled={items.length === 1}
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() =>
            setItems((prev) => [...prev, { description: "", qty: "1", unit_price: "" }])
          }
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add Item
        </Button>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Charges & Tax">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Delivery Charges</Label>
              <Input
                type="number"
                min="0"
                value={draft.delivery_charges}
                onChange={(e) => set("delivery_charges", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Other Charges</Label>
              <Input
                type="number"
                min="0"
                value={draft.other_charges}
                onChange={(e) => set("other_charges", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
            <Checkbox
              id="with_tax"
              checked={draft.with_tax}
              onCheckedChange={(v) => set("with_tax", v === true)}
            />
            <Label htmlFor="with_tax" className="cursor-pointer text-sm font-semibold">
              Invoice With Tax
            </Label>
          </div>
          {draft.with_tax ? (
            <div className="mt-3 space-y-1.5">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={draft.tax_rate}
                onChange={(e) => set("tax_rate", e.target.value)}
              />
            </div>
          ) : null}
          <div className="mt-5 space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Thank you for choosing Corporate Gifting Solution."
            />
          </div>
        </Section>

        <Section title="Summary">
          <dl className="space-y-2.5 text-sm">
            {[
              ["Subtotal", totals.subtotal],
              ["Delivery Charges", toNum(draft.delivery_charges)],
              ["Other Charges", toNum(draft.other_charges)],
              ["Amount Before Tax", totals.beforeTax],
              [draft.with_tax ? `Tax (${totals.taxRate}%)` : "Tax", totals.taxAmount],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="num font-semibold">{formatPKR(value as number)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
            <span className="text-sm font-bold uppercase tracking-[0.1em]">Grand Total</span>
            <span className="stat-figure text-xl font-bold">{formatPKR(totals.grandTotal)}</span>
          </div>
          <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Total in words
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {amountInWords(totals.grandTotal)}
            </p>
          </div>
        </Section>
      </div>

      <div className="no-print flex flex-wrap gap-2">
        <Button onClick={() => submit("save")} disabled={save.isPending}>
          {save.isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-4 w-4" />
          )}
          Save Invoice
        </Button>
        <Button variant="outline" onClick={() => submit("save-download")} disabled={save.isPending}>
          <Download className="mr-1.5 h-4 w-4" /> Save &amp; Download PDF
        </Button>
        <Button variant="ghost" onClick={() => navigate("/invoices")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
