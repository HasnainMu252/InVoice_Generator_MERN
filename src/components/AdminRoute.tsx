import { ShieldAlert } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

/**
 * Admin-only section guard. The server enforces this too — this only spares
 * staff a wall of failed requests.
 */
export function AdminRoute() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <AppShell title="Restricted" breadcrumb={["CGS Finance", "Restricted"]}>
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
          <h2 className="mt-3 text-lg font-bold">Administrators only</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            User management is limited to administrator accounts.
          </p>
          <Button asChild className="mt-4">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return <Outlet />;
}
