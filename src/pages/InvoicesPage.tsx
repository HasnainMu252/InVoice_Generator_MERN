import { Link, useNavigate } from "react-router-dom";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INVOICE_STATUSES, SERVICES } from "@/lib/cgs";
import { useDeleteInvoice, useInvoices, useSettings, useUpdateInvoiceStatus } from "@/lib/data";
import { exportCSV, exportExcel } from "@/lib/export";
import { formatDate, formatPKR } from "@/lib/format";
import { downloadInvoicePdf, exportTablePdf } from "@/lib/pdf";


export default function InvoicesPage() {
  const navigate = useNavigate();
  const { data: invoices = [], isLoading } = useInvoices();
  const settings = useSettings();
  const updateStatus = useUpdateInvoiceStatus();
  const remove = useDeleteInvoice();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [service, setService] = useState("all");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (status !== "all" && inv.status !== status) return false;
      if (service !== "all" && inv.service !== service) return false;
      if (!term) return true;
      return [inv.invoice_number, inv.to_company, inv.to_contact_person, inv.to_email]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [invoices, q, status, service]);

  const total = rows.reduce((sum, r) => sum + Number(r.grand_total ?? 0), 0);

  const exportRows = () =>
    rows.map((r) => ({
      "Invoice #": r.invoice_number,
      Date: r.invoice_date,
      Client: r.to_company || r.to_contact_person,
      Service: r.service,
      Status: r.status,
      Subtotal: r.subtotal,
      Tax: r.tax_amount,
      "Grand Total": r.grand_total,
    }));

  return (
    <AppShell
      title="All Invoices"
      breadcrumb={["CGS Finance", "Invoices"]}
      description={`${rows.length} invoice(s) · ${formatPKR(total)} billed`}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCSV(exportRows(), "cgs-invoices")}
          >
            <FileText className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportExcel(exportRows(), "cgs-invoices")}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportTablePdf({
                title: "Invoice Register",
                subtitle: "CGS Finance System",
                columns: ["Invoice #", "Date", "Client", "Service", "Status", "Total"],
                rows: rows.map((r) => [
                  r.invoice_number,
                  formatDate(r.invoice_date),
                  r.to_company || r.to_contact_person || "—",
                  r.service,
                  r.status,
                  formatPKR(r.grand_total),
                ]),
                summary: [
                  ["Invoices", String(rows.length)],
                  ["Total Billed", formatPKR(total)],
                ],
                filename: "cgs-invoices",
                landscape: true,
              })
            }
          >
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button size="sm" onClick={() => navigate("/invoices/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Invoice
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
            placeholder="Search invoice number, client, email…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {INVOICE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-accent/60 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Invoice #</th>
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Client</th>
              <th className="px-4 py-3 text-left font-semibold">Service</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Loading invoices…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No invoices match your filters.
                </td>
              </tr>
            ) : (
              rows.map((inv) => (
                <tr key={inv.id} className="border-t border-border/70 hover:bg-accent/40">
                  <td className="px-4 py-3 font-semibold text-primary">
                    <Link to={`/invoices/${inv.id}`}>
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatDate(inv.invoice_date)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{inv.to_company || "—"}</div>
                    <div className="text-xs text-muted-foreground">{inv.to_contact_person}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.service}</td>
                  <td className="stat-figure px-4 py-3 text-right font-semibold">
                    {formatPKR(inv.grand_total)}
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={inv.status}
                      onValueChange={(value) =>
                        updateStatus.mutate(
                          { id: inv.id, status: value },
                          { onSuccess: () => toast.success(`Marked ${value}`) },
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-[130px] border-0 bg-transparent p-0 shadow-none focus:ring-0">
                        <StatusBadge status={inv.status} />
                      </SelectTrigger>
                      <SelectContent>
                        {INVOICE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" title="View">
                        <Link to={`/invoices/${inv.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon" title="Edit">
                        <Link to={`/invoices/${inv.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Download PDF"
                        onClick={() =>
                          downloadInvoicePdf(inv, settings.data ?? null).catch(() =>
                            toast.error("Could not generate PDF"),
                          )
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        className="text-destructive"
                        onClick={() => {
                          if (!confirm(`Delete invoice ${inv.invoice_number}?`)) return;
                          remove.mutate(inv.id, {
                            onSuccess: () => toast.success("Invoice deleted"),
                            onError: () => toast.error("Delete failed"),
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
