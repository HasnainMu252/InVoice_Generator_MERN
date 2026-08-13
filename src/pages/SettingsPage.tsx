
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSaveSettings, useSettings, type Settings } from "@/lib/data";
import { toNum } from "@/lib/format";


type Form = Omit<Settings, "id" | "default_tax_rate"> & { default_tax_rate: string };

const blank: Form = {
  company_name: "",
  ntn: "",
  phone: "",
  email: "",
  website: "",
  address: "",
  logo_url: "",
  bank_title: "",
  bank_account: "",
  bank_iban: "",
  bank_name: "",
  invoice_prefix: "",
  default_tax_rate: "18",
  default_notes: "",
};

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  const save = useSaveSettings();
  const [form, setForm] = useState<Form>(blank);

  useEffect(() => {
    if (!data) return;
    setForm({
      company_name: data.company_name,
      ntn: data.ntn,
      phone: data.phone,
      email: data.email,
      website: data.website,
      address: data.address,
      logo_url: data.logo_url,
      bank_title: data.bank_title,
      bank_account: data.bank_account,
      bank_iban: data.bank_iban,
      bank_name: data.bank_name,
      invoice_prefix: data.invoice_prefix,
      default_tax_rate: String(data.default_tax_rate ?? 18),
      default_notes: data.default_notes,
    });
  }, [data]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    save.mutate(
      { ...form, default_tax_rate: toNum(form.default_tax_rate) },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: () => toast.error("Could not save settings"),
      },
    );
  };

  return (
    <AppShell
      title="Settings"
      breadcrumb={["CGS Finance", "Settings"]}
      description="Company profile used across invoices, PDFs and reports"
      actions={
        <Button onClick={submit} disabled={save.isPending}>
          {save.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-muted-foreground">Loading settings…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-primary">
              Company Profile
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  label="Company Name"
                  value={form.company_name}
                  onChange={(v) => set("company_name", v)}
                />
              </div>
              <Field label="NTN" value={form.ntn} onChange={(v) => set("ntn", v)} />
              <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
              <Field label="Email" value={form.email} onChange={(v) => set("email", v)} />
              <Field label="Website" value={form.website} onChange={(v) => set("website", v)} />
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <p className="text-xs text-muted-foreground">
                  The CGS logo is bundled with the application at{" "}
                  <code className="font-semibold">frontend/src/assets/CGSLOGO.png</code>. Replace
                  that file to change the logo across the app, invoices and PDF exports.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-primary">
              Bank Details
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Account Title"
                value={form.bank_title}
                onChange={(v) => set("bank_title", v)}
              />
              <Field
                label="Bank Name"
                value={form.bank_name}
                onChange={(v) => set("bank_name", v)}
              />
              <Field
                label="Account Number"
                value={form.bank_account}
                onChange={(v) => set("bank_account", v)}
              />
              <Field label="IBAN" value={form.bank_iban} onChange={(v) => set("bank_iban", v)} />
            </div>

            <h2 className="mb-4 mt-6 text-sm font-bold uppercase tracking-[0.12em] text-primary">
              Invoice Defaults
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Invoice Prefix"
                value={form.invoice_prefix}
                onChange={(v) => set("invoice_prefix", v)}
                placeholder="CGS-INV-"
              />
              <Field
                label="Default Tax Rate (%)"
                value={form.default_tax_rate}
                onChange={(v) => set("default_tax_rate", v)}
              />
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Default Invoice Notes</Label>
                <Textarea
                  rows={3}
                  value={form.default_notes}
                  onChange={(e) => set("default_notes", e.target.value)}
                />
              </div>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
