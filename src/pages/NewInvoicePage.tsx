import { AppShell } from "@/components/AppShell";
import { InvoiceForm } from "@/components/InvoiceForm";

export default function NewInvoicePage() {
  return (
    <AppShell
      title="Create Invoice"
      breadcrumb={["CGS Finance", "Invoices", "Create"]}
      description="All calculations update live as you type"
    >
      <InvoiceForm />
    </AppShell>
  );
}
