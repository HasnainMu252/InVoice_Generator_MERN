import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Confirmation for destructive actions. When `confirmWord` is set the button
 * stays disabled until the user types it exactly — used for the bulk deletes,
 * which cannot be undone.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmWord,
  confirmLabel = "Delete",
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmWord?: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const ready = !confirmWord || typed.trim().toUpperCase() === confirmWord.toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/12">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">{description}</DialogDescription>
        </DialogHeader>

        {confirmWord ? (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-word">
              Type <span className="font-bold text-destructive">{confirmWord}</span> to confirm
            </Label>
            <Input
              id="confirm-word"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmWord}
              autoComplete="off"
            />
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!ready || pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
