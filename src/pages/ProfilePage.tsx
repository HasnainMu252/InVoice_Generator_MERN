import { KeyRound, Loader2, Save, ShieldCheck, UserCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PasswordInput, validatePasswordPair } from "@/components/PasswordFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { api, apiMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";

export default function ProfilePage() {
  const { user, setUser } = useAuth();

  const [details, setDetails] = useState({
    full_name: user?.full_name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const [savingDetails, setSavingDetails] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [changing, setChanging] = useState(false);

  const saveDetails = async () => {
    setSavingDetails(true);
    try {
      const res = await api.put("/auth/profile", details);
      setUser(res.data.user);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(apiMessage(error, "Could not update your profile"));
    } finally {
      setSavingDetails(false);
    }
  };

  const changePassword = async () => {
    const problem = validatePasswordPair(next, confirm);
    if (problem) {
      toast.error(problem);
      return;
    }
    if (!current) {
      toast.error("Enter your current password");
      return;
    }
    setChanging(true);
    try {
      await api.post("/auth/change-password", {
        current_password: current,
        new_password: next,
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password changed. Use it next time you sign in.");
    } catch (error) {
      toast.error(apiMessage(error, "Could not change your password"));
    } finally {
      setChanging(false);
    }
  };

  return (
    <AppShell
      title="My Profile"
      breadcrumb={["CGS Finance", "Profile"]}
      description="Your account details and password"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <UserCog className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-primary">
              Account Details
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input readOnly value={user?.username ?? ""} className="bg-muted/50 font-semibold" />
              <p className="text-[11px] text-muted-foreground">
                Usernames can only be changed by an administrator.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                value={details.full_name}
                onChange={(e) => setDetails((d) => ({ ...d, full_name: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={details.email}
                onChange={(e) => setDetails((d) => ({ ...d, email: e.target.value }))}
                placeholder="you@corporategiftingsolution.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={details.phone}
                onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))}
                placeholder="+92 300 1234567"
              />
            </div>
          </div>

          <Button className="mt-5 w-full sm:w-auto" onClick={saveDetails} disabled={savingDetails}>
            {savingDetails ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </section>

       

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-primary">
              Change Password
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <PasswordInput
                id="current-password"
                label="Current Password"
                value={current}
                onChange={setCurrent}
                autoComplete="current-password"
              />
            </div>
            <PasswordInput id="new-password" label="New Password" value={next} onChange={setNext} />
            <PasswordInput
              id="confirm-password"
              label="Confirm New Password"
              value={confirm}
              onChange={setConfirm}
            />
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Minimum 8 characters. You stay signed in on this device after changing it.
          </p>

          <Button className="mt-4 w-full sm:w-auto" onClick={changePassword} disabled={changing}>
            {changing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            Update Password
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
