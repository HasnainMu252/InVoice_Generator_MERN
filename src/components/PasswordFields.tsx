import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const MIN_PASSWORD = 8;

/** Shared password input with a show/hide toggle. */
export function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete = "new-password",
  placeholder = "••••••••",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/** Returns an error string, or null when the pair is acceptable. */
export function validatePasswordPair(next: string, confirm: string): string | null {
  if (next.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters`;
  if (next !== confirm) return "The two passwords do not match";
  return null;
}
