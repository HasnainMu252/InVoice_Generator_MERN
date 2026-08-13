import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Pencil, Printer } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useInvoice, useSettings } from "@/lib/data";
import { amountInWords, formatDate, formatPKR } from "@/lib/format";
import { downloadInvoicePdf, printInvoicePdf } from "@/lib/pdf";


function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

export default function InvoiceViewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: invoice, isLoading } = useInvoice(id);
  const settings = useSettings();

  if (isLoading) {
    return (
      <AppShell title="Invoice" breadcrumb={["CGS Finance", "Invoices", "View"]}>
        <p className="text-muted-foreground">Loading invoice…</p>
      </AppShell>
    );
  }

  if (!invoice) {
    return (
      <AppShell title="Invoice not found" breadcrumb={["CGS Finance", "Invoices", "View"]}>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <p className="text-muted-foreground">This invoice no longer exists.</p>
          <Button asChild className="mt-4">
            <Link to="/invoices">Back to invoices</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const items = invoice.invoice_items ?? [];

  return (
    <AppShell
      title={invoice.invoice_number}
      breadcrumb={["CGS Finance", "Invoices", invoice.invoice_number]}
      description={`${invoice.service} · ${formatDate(invoice.invoice_date)}`}
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link to="/invoices">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/invoices/${invoice.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              printInvoicePdf(invoice, settings.data ?? null).catch(() =>
                toast.error("Could not open print view"),
              )
            }
          >
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button
            size="sm"
            onClick={() =>
              downloadInvoicePdf(invoice, settings.data ?? null).catch(() =>
                toast.error("Could not generate PDF"),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-primary">From</h2>
          <Row label="Company" value={invoice.from_company} />
          <Row label="NTN" value={invoice.from_ntn} />
          <Row label="Phone" value={invoice.from_phone} />
          <Row label="Email" value={invoice.from_email} />
          <Row label="Website" value={invoice.from_website} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-primary">
            Bill To
          </h2>
          <Row label="Contact" value={invoice.to_contact_person} />
          <Row label="Company" value={invoice.to_company} />
          <Row label="Phone" value={invoice.to_phone} />
          <Row label="Email" value={invoice.to_email} />
          <Row label="Address" value={invoice.to_address} />
          <Row label="NTN" value={invoice.to_ntn} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-primary">
            Invoice Info
          </h2>
          <Row label="Invoice Date" value={formatDate(invoice.invoice_date)} />
          <Row label="Due Date" value={formatDate(invoice.due_date)} />
          <Row label="Service" value={invoice.service} />
          <Row label="Tax" value={invoice.with_tax ? `${invoice.tax_rate}%` : "Not applied"} />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="bg-accent/60 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">#</th>
              <th className="px-4 py-3 text-left font-semibold">Description</th>
              <th className="px-4 py-3 text-right font-semibold">Qty</th>
              <th className="px-4 py-3 text-right font-semibold">Unit Price</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No line items.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id ?? index} className="border-t border-border/70">
                  <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="stat-figure px-4 py-3 text-right">{item.qty}</td>
                  <td className="stat-figure px-4 py-3 text-right">{formatPKR(item.unit_price)}</td>
                  <td className="stat-figure px-4 py-3 text-right font-semibold">
                    {formatPKR(item.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-primary">
            Amount in Words
          </h2>
          <p className="text-sm font-medium text-foreground">
            {amountInWords(invoice.grand_total)}
          </p>
          {invoice.notes ? (
            <>
              <h2 className="mb-2 mt-5 text-sm font-bold uppercase tracking-[0.12em] text-primary">
                Notes
              </h2>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{invoice.notes}</p>
            </>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <Row label="Subtotal" value={formatPKR(invoice.subtotal)} />
          <Row label="Delivery Charges" value={formatPKR(invoice.delivery_charges)} />
          <Row label="Other Charges" value={formatPKR(invoice.other_charges)} />
          <Row
            label={`Tax ${invoice.with_tax ? `(${invoice.tax_rate}%)` : ""}`}
            value={formatPKR(invoice.tax_amount)}
          />
          <div className="mt-3 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">Grand Total</span>
            <span className="stat-figure text-lg font-bold">{formatPKR(invoice.grand_total)}</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
