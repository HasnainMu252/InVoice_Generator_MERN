import { Download, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { BulkBar } from "@/components/BulkBar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { INVOICE_STATUSES, SERVICES } from "@/lib/cgs";
import {
  useDeleteAllInvoices,
  useDeleteInvoice,
  useImportInvoices,
  useInvoices,
  useSettings,
  useUpdateInvoiceStatus,
  type Invoice,
} from "@/lib/data";
import { formatDate, formatPKR } from "@/lib/format";
import { downloadInvoicePdf } from "@/lib/pdf-lazy";
import {
  downloadInvoiceTemplate,
  exportInvoicesWorkbook,
  parseInvoicesWorkbook,
} from "@/lib/workbook";

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { data: invoices = [], isLoading } = useInvoices();
  const settings = useSettings();
  const updateStatus = useUpdateInvoiceStatus();
  const remove = useDeleteInvoice();
  const removeAll = useDeleteAllInvoices();
  const importInvoices = useImportInvoices();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [service, setService] = useState("all");
  const [deleting, setDeleting] = useState<Invoice | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return invoices.filter((i) => {
      if (status !== "all" && i.status !== status) return false;
      if (service !== "all" && i.service !== service) return false;
      if (!term) return true;
      return [i.invoice_number, i.to_company, i.to_contact_person, i.to_email]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [invoices, q, status, service]);

  const total = rows.reduce((s, i) => s + Number(i.grand_total ?? 0), 0);

  const savePdf = (invoice: Invoice) =>
    downloadInvoicePdf(invoice, settings.data ?? null).catch(() =>
      toast.error("Could not generate the PDF"),
    );

  const changeStatus = (id: string, next: string) =>
    updateStatus
      .mutateAsync({ id, status: next })
      .then(() => toast.success(`Marked ${next}`))
      .catch(() => toast.error("Could not update the status"));

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting!.id);
      toast.success(`Deleted ${deleting!.invoice_number}`);
      setDeleting(null);
    } catch {
      toast.error("Could not delete the invoice");
    }
  };

  return (
    <AppShell
      title="All Invoices"
      breadcrumb={["CGS Finance", "Invoices"]}
      description={`${rows.length} invoice(s) · ${formatPKR(total)} billed`}
      actions={
        <Button size="sm" onClick={() => navigate("/invoices/new")}>
          <Plus className="mr-1.5 h-4 w-4" /> New Invoice
        </Button>
      }
    >
      <BulkBar
        entity="invoices"
        count={invoices.length}
        onExport={() => exportInvoicesWorkbook(invoices)}
        onTemplate={downloadInvoiceTemplate}
        onParse={(file) => parseInvoicesWorkbook(file)}
        onImport={(r, mode) => importInvoices.mutateAsync({ rows: r, mode })}
        onDeleteAll={() => removeAll.mutateAsync()}
        deleting={removeAll.isPending}
      />

      <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-3 shadow-card sm:flex sm:flex-wrap sm:p-4">
        <div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search invoice, client, email…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
            {invoices.length ? "No invoices match those filters." : "No invoices yet."}
          </p>
          <Button className="mt-4" onClick={() => navigate("/invoices/new")}>
            <Plus className="mr-2 h-4 w-4" /> Create your first invoice
          </Button>
        </div>
      ) : (
        <>
          {/* Phone: one card per invoice. */}
          <div className="space-y-3 lg:hidden">
            {rows.map((inv) => (
              <div
                key={inv.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="font-bold text-primary hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(inv.invoice_date)} · {inv.service}
                    </p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>

                <p className="mt-2 truncate text-sm font-medium">{inv.to_company || "—"}</p>
                <p className="truncate text-xs text-muted-foreground">{inv.to_contact_person}</p>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-accent/40 px-3 py-2">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Grand Total
                  </span>
                  <span className="stat-figure text-sm font-bold">
                    {formatPKR(inv.grand_total)}
                  </span>
                </div>

                <div className="mt-3">
                  <Select value={inv.status} onValueChange={(v) => changeStatus(inv.id, v)}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVOICE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <Link to={`/invoices/${inv.id}`}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => savePdf(inv)}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/invoices/${inv.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setDeleting(inv)}
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
                  <th className="px-4 py-3 text-left font-semibold">Invoice #</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Client</th>
                  <th className="px-4 py-3 text-left font-semibold">Service</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Grand Total</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((inv) => (
                  <tr key={inv.id} className="hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatDate(inv.invoice_date)}</td>
                    <td className="max-w-[220px] px-4 py-3">
                      <div className="truncate font-medium">{inv.to_company || "—"}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {inv.to_contact_person}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{inv.service}</td>
                    <td className="px-4 py-3">
                      <Select value={inv.status} onValueChange={(v) => changeStatus(inv.id, v)}>
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
                    <td className="stat-figure px-4 py-3 text-right font-semibold">
                      {formatPKR(inv.grand_total)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" title="View" asChild>
                          <Link to={`/invoices/${inv.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Download PDF"
                          onClick={() => savePdf(inv)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Edit" asChild>
                          <Link to={`/invoices/${inv.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Delete"
                          className="text-destructive"
                          onClick={() => setDeleting(inv)}
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
        title={`Delete ${deleting?.invoice_number}?`}
        description="This invoice and all of its line items will be permanently removed."
        confirmLabel="Delete Invoice"
        pending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </AppShell>
  );
}
