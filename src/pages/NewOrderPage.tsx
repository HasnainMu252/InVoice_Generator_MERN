import { AppShell } from "@/components/AppShell";
import { OrderForm } from "@/components/OrderForm";

export default function NewOrderPage() {
  return (
    <AppShell
      title="Add Order"
      breadcrumb={["CGS Finance", "Orders", "Add"]}
      description="Order code is generated automatically"
    >
      <OrderForm />
    </AppShell>
  );
}
