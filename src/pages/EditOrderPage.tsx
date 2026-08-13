import { Link, useParams } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { OrderForm } from "@/components/OrderForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrder } from "@/lib/data";

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useOrder(id);

  return (
    <AppShell
      title={order ? `Edit ${order.order_code}` : "Edit Order"}
      breadcrumb={["CGS Finance", "Orders", "Edit"]}
      description="Changes apply immediately to reports and profit calculations"
    >
      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : order ? (
        <OrderForm existing={order} />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <p className="text-muted-foreground">This order no longer exists.</p>
          <Button asChild className="mt-4">
            <Link to="/orders">Back to orders</Link>
          </Button>
        </div>
      )}
    </AppShell>
  );
}
