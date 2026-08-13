import {
  BarChart3,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Receipt,
  Settings as SettingsIcon,
  ShoppingCart,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import CGSLOGO from "../assets/CGSLOGO.png";

import { Logo, LogoLockup } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string; icon: typeof LayoutDashboard; exact?: boolean };
type NavGroup = { label: string; icon: typeof LayoutDashboard; items: NavItem[] };

// Expenses is intentionally absent: every expense is now entered inside the Order Form.
const NAV: Array<NavItem | NavGroup> = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  {
    label: "Invoices",
    icon: FileText,
    items: [
      { label: "All Invoices", to: "/invoices", icon: FileText, exact: true },
      { label: "Create Invoice", to: "/invoices/new", icon: Plus },
    ],
  },
  {
    label: "Orders",
    icon: ShoppingCart,
    items: [
      { label: "All Orders", to: "/orders", icon: ShoppingCart, exact: true },
      { label: "Add Order", to: "/orders/new", icon: Plus },
    ],
  },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Settings", to: "/settings", icon: SettingsIcon },
];

function isGroup(entry: NavItem | NavGroup): entry is NavGroup {
  return "items" in entry;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const active = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  const linkClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
    );

  const signOut = () => {
    logout();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
        <img src={CGSLOGO}></img>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((entry) =>
          isGroup(entry) ? (
            <div key={entry.label} className="pt-2">
              <div className="flex items-center gap-2 px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
                <entry.icon className="h-3 w-3" />
                {entry.label}
              </div>
              {entry.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={linkClass(active(item.to, item.exact))}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          ) : (
            <Link
              key={entry.to}
              to={entry.to}
              onClick={onNavigate}
              className={linkClass(active(entry.to, entry.exact))}
            >
              <entry.icon className="h-4 w-4" />
              {entry.label}
            </Link>
          ),
        )}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
            CGS
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-sidebar-primary">
              {user?.username ?? "CGS123"}
            </div>
            <div className="truncate text-[11px] text-sidebar-foreground/60">
              {user?.full_name ?? "Administrator"}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={signOut}
          className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </div>
    </div>
  );
}

export function AppShell({
  title,
  breadcrumb,
  description,
  actions,
  children,
}: {
  title: string;
  breadcrumb?: string[];
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const crumbs = breadcrumb ?? [title];

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border lg:block">
        <SidebarContent />
      </aside>

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-sidebar-border p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SidebarContent onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                <Receipt className="h-3 w-3" />
                {crumbs.map((crumb, i) => (
                  <span key={crumb} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-border">/</span>}
                    <span className={i === crumbs.length - 1 ? "text-primary" : ""}>{crumb}</span>
                  </span>
                ))}
              </div>
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {title}
              </h1>
              {description ? (
                <p className="truncate text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
