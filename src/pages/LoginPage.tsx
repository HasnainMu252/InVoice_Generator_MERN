import { Eye, EyeOff, Loader2, Lock, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CSG from "../assets/CGSLOGO.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { apiMessage } from "@/lib/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setSubmitting(true);

    try {
      await login(username.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(apiMessage(err, "Invalid username or password."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* LEFT SIDE */}
      <div className="brand-gradient relative hidden flex-1 flex-col justify-between p-12 text-primary-foreground lg:flex">
        
        {/* Logo */}
        <div className="flex items-start">
          <img
            src={CSG}
            alt="CGS Logo"
            className="h-auto w-auto max-h-20 max-w-[220px] object-contain"
          />
        </div>

        <div className="max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">
            Finance, invoicing &amp; profit control for Corporate Gifting
            Solution.
          </h2>

          <p className="mt-4 text-sm text-primary-foreground/75">
            Track every order, expense and invoice in one secure corporate
            workspace — with live profit calculations and professional PDF
            invoices.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-primary-foreground/70">
          <ShieldCheck className="h-4 w-4" />
          Secure, authenticated access
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          
          {/* Mobile Logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <img
              src={CSG}
              alt="CGS Logo"
              className="h-auto w-auto max-h-20 max-w-[200px] object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            CGS Finance System
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to continue.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>

              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="username"
                  autoComplete="username"
                  className="pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="CGS123"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  className="pl-9 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error ? (
              <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}

              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}