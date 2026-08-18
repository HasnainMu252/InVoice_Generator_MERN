import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  User,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CSG from "../assets/cgsWhite.svg";
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#06152f] via-[#0a2a66] to-[#081b40]">

      {/* Background Decorations */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-10 h-[500px] w-[500px] rounded-full bg-cyan-400/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-[30%] top-[20%] h-[300px] w-[300px] rounded-full bg-indigo-500/10 blur-[100px]" />

      <div className="relative z-10 flex min-h-screen">

        {/* ================= LEFT SIDE ================= */}
        <div className="hidden w-[55%] flex-col justify-between px-12 py-10 lg:flex xl:px-20">

          {/* Logo */}
          <div>
            <div className="inline-flex rounded-2xl bg-white  px-5 py-3 shadow-xl shadow-black/10">
              <img
                src={CSG}
                alt="CGS Logo"
                className="h-auto max-h-[90px] w-auto max-w-[300px] object-contain rounded-md"
              />
            </div>
          </div>

          {/* Main Marketing Content */}
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-blue-100 backdrop-blur-md">
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
              Secure Corporate Finance Platform
            </div>

            <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-white xl:text-5xl">
              Smarter finance management for
              <span className="block bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                Corporate Gifting Solution.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-blue-100/70">
              Manage invoices, expenses, orders and profitability from one
              secure workspace built specifically for your business.
            </p>

            {/* Features */}
            <div className="mt-9 grid max-w-xl grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-sm text-blue-100/85">
                <CheckCircle2 className="h-5 w-5 flex-none text-cyan-300" />
                Professional Invoices
              </div>

              <div className="flex items-center gap-3 text-sm text-blue-100/85">
                <CheckCircle2 className="h-5 w-5 flex-none text-cyan-300" />
                Live Profit Tracking
              </div>

              <div className="flex items-center gap-3 text-sm text-blue-100/85">
                <CheckCircle2 className="h-5 w-5 flex-none text-cyan-300" />
                Expense Management
              </div>

              <div className="flex items-center gap-3 text-sm text-blue-100/85">
                <CheckCircle2 className="h-5 w-5 flex-none text-cyan-300" />
                Secure Access
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 text-xs text-blue-100/50">
            <ShieldCheck className="h-4 w-4" />
            Protected & authenticated corporate access
          </div>
        </div>

        {/* ================= RIGHT SIDE ================= */}
        <div className="flex w-full items-center justify-center px-5 py-10 lg:w-[45%] lg:px-10">

          <div className="w-full max-w-[440px]">

            {/* Login Glass Card */}
            <div className="rounded-[28px] border border-white/15 bg-white/[0.96] p-7 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-9">

              {/* Mobile Logo */}
              <div className="mb-7 flex justify-center lg:hidden">
                <img
                  src={CSG}
                  alt="CGS Logo"
                  className="h-auto max-h-[75px] w-auto max-w-[210px] object-contain"
                />
              </div>

              {/* Heading */}
              <div className="mb-8">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Authorized Access
                </div>

                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to access your CGS Finance dashboard.
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={submit} className="space-y-5">

                {/* Username */}
                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Username
                  </Label>

                  <div className="group relative">
                    <User className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />

                    <Input
                      id="username"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="h-12 rounded-xl border-slate-200 bg-slate-50/80 pl-11 text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Password
                  </Label>

                  <div className="group relative">
                    <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />

                    <Input
                      id="password"
                      type={show ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-12 rounded-xl border-slate-200 bg-slate-50/80 pl-11 pr-12 text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />

                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      aria-label={show ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      {show ? (
                        <EyeOff className="h-[18px] w-[18px]" />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {error}
                  </div>
                ) : null}

                {/* Sign In Button */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:from-blue-800 hover:to-blue-700 hover:shadow-xl hover:shadow-blue-600/25"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in to Dashboard
                      <ShieldCheck className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Bottom Info */}
              <div className="mt-7 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Lock className="h-3.5 w-3.5" />
                  Your connection is secure and encrypted
                </div>
              </div>
            </div>

            {/* Copyright */}
            <p className="mt-6 text-center text-xs text-blue-100/50">
              © {new Date().getFullYear()} Corporate Gifting Solution.
              All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}