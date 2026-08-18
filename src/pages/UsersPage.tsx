import { KeyRound, Loader2, Pencil, Plus, Save, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PasswordInput, validatePasswordPair } from "@/components/PasswordFields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { apiMessage } from "@/lib/api";
import {
  useDeleteUser,
  useResetUserPassword,
  useSaveUser,
  useUsers,
  type AppUser,
} from "@/lib/data";
import { formatDate } from "@/lib/format";

const blankForm = {
  username: "",
  full_name: "",
  email: "",
  phone: "",
  role: "staff" as "admin" | "staff",
  active: true,
  password: "",
  confirm: "",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        role === "admin" ? "bg-primary/12 text-primary" : "bg-accent text-accent-foreground"
      }`}
    >
      {role === "admin" ? "Administrator" : "Staff"}
    </span>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const { data: users = [], isLoading } = useUsers();
  const save = useSaveUser();
  const resetPassword = useResetUserPassword();
  const remove = useDeleteUser();

  const [editing, setEditing] = useState<AppUser | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(blankForm);

  const [pwUser, setPwUser] = useState<AppUser | null>(null);
  const [pw, setPw] = useState({ next: "", confirm: "" });

  const [deleting, setDeleting] = useState<AppUser | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setFormOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditing(u);
    setForm({
      username: u.username,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      active: u.active,
      password: "",
      confirm: "",
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    if (!form.username.trim()) {
      toast.error("Username is required");
      return;
    }
    if (!editing) {
      const problem = validatePasswordPair(form.password, form.confirm);
      if (problem) {
        toast.error(problem);
        return;
      }
    }
    try {
      await save.mutateAsync({
        id: editing?.id,
        payload: {
          username: form.username.trim(),
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          active: form.active,
          ...(editing ? {} : { password: form.password }),
        },
      });
      toast.success(editing ? "User updated" : `User "${form.username.trim()}" created`);
      setFormOpen(false);
    } catch (error) {
      toast.error(apiMessage(error, "Could not save the user"));
    }
  };

  const submitPassword = async () => {
    const problem = validatePasswordPair(pw.next, pw.confirm);
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      await resetPassword.mutateAsync({ id: pwUser!.id, new_password: pw.next });
      toast.success(`Password reset for ${pwUser!.username}`);
      setPwUser(null);
      setPw({ next: "", confirm: "" });
    } catch (error) {
      toast.error(apiMessage(error, "Could not reset the password"));
    }
  };

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting!.id);
      toast.success(`Deleted ${deleting!.username}`);
      setDeleting(null);
    } catch (error) {
      toast.error(apiMessage(error, "Could not delete the user"));
    }
  };

  return (
    <AppShell
      title="User Management"
      breadcrumb={["CGS Finance", "Users"]}
      description="Create accounts, set roles and reset passwords"
      actions={
        <Button size="sm" onClick={openCreate}>
          <UserPlus className="mr-1.5 h-4 w-4" /> Add User
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Phone: stacked cards. Desktop: table. */}
          <div className="space-y-3 lg:hidden">
            {users.map((u) => (
              <div key={u.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{u.username}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.full_name || "No name set"}
                    </p>
                  </div>
                  <RoleBadge role={u.role} />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className={u.active ? "font-medium text-success" : "font-medium text-destructive"}>
                      {u.active ? "Active" : "Deactivated"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Last sign-in</dt>
                    <dd className="font-medium">
                      {u.last_login_at ? formatDate(u.last_login_at) : "Never"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(u)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPwUser(u)}
                  >
                    <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Password
                  </Button>
                  {u.id !== me?.id ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => setDeleting(u)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card shadow-card lg:block">
            <table className="w-full text-sm">
              <thead className="bg-accent/50 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">User</th>
                  <th className="px-4 py-3 text-left font-semibold">Contact</th>
                  <th className="px-4 py-3 text-left font-semibold">Role</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Last Sign-in</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{u.username}</div>
                      <div className="text-xs text-muted-foreground">
                        {u.full_name || "No name set"}
                        {u.id === me?.id ? " · you" : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>{u.email || "—"}</div>
                      <div>{u.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${u.active ? "text-success" : "text-destructive"}`}
                      >
                        {u.active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.last_login_at ? formatDate(u.last_login_at) : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Reset password"
                          onClick={() => setPwUser(u)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={u.id === me?.id ? "You cannot delete yourself" : "Delete"}
                          disabled={u.id === me?.id}
                          className="text-destructive disabled:opacity-30"
                          onClick={() => setDeleting(u)}
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

          {!users.length ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No users yet.</p>
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add the first user
              </Button>
            </div>
          ) : null}
        </>
      )}

      {/* ------------------------------ create / edit ----------------------------- */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.username}` : "Add User"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                placeholder="e.g. umer"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="Muhammad Umer"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => set("role", v as "admin" | "staff")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.active ? "active" : "inactive"}
                onValueChange={(v) => set("active", v === "active")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Deactivated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!editing ? (
              <>
                <PasswordInput
                  id="user-password"
                  label="Password"
                  value={form.password}
                  onChange={(v) => set("password", v)}
                />
                <PasswordInput
                  id="user-password-confirm"
                  label="Confirm Password"
                  value={form.confirm}
                  onChange={(v) => set("confirm", v)}
                />
              </>
            ) : (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Use the key icon on the list to reset this user's password.
              </p>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Staff can do everything except manage users. Administrators can do everything.
          </p>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitForm} disabled={save.isPending}>
              {save.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {editing ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------- reset password ---------------------------- */}
      <Dialog open={Boolean(pwUser)} onOpenChange={(o) => !o && setPwUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password for {pwUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <PasswordInput
              id="reset-password"
              label="New Password"
              value={pw.next}
              onChange={(v) => setPw((p) => ({ ...p, next: v }))}
            />
            <PasswordInput
              id="reset-password-confirm"
              label="Confirm New Password"
              value={pw.confirm}
              onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
            />
            <p className="text-[11px] text-muted-foreground">
              The user is not notified automatically — share the new password with them directly.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPwUser(null)}>
              Cancel
            </Button>
            <Button onClick={submitPassword} disabled={resetPassword.isPending}>
              {resetPassword.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.username}?`}
        description="This permanently removes the account. Any orders or invoices they created are kept."
        confirmLabel="Delete User"
        pending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </AppShell>
  );
}
