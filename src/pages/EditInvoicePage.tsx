import { useParams } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { InvoiceForm } from "@/components/InvoiceForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoice } from "@/lib/data";

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const invoice = useInvoice(id);

  return (
    <AppShell
      title={invoice.data ? `Edit ${invoice.data.invoice_number}` : "Edit Invoice"}
      breadcrumb={["CGS Finance", "Invoices", "Edit"]}
    >
      {invoice.isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : invoice.data ? (
        <InvoiceForm existing={invoice.data} />
      ) : (
        <p className="text-sm text-muted-foreground">Invoice not found.</p>
      )}
    </AppShell>
  );
}
