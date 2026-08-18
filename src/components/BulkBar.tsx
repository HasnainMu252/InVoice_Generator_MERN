import { Download, FileSpreadsheet, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiMessage } from "@/lib/api";
import type { BulkResult } from "@/lib/data";

/**
 * Import / export / delete-all controls shared by the Orders and Invoices pages.
 * The export and the importer use the same workbook schema, so a downloaded file
 * can be edited and uploaded straight back.
 */
export function BulkBar({
  entity,
  count,
  onExport,
  onTemplate,
  onParse,
  onImport,
  onDeleteAll,
  deleting,
}: {
  entity: "orders" | "invoices";
  count: number;
  onExport: () => Promise<void>;
  onTemplate: () => Promise<void>;
  onParse: (file: File) => Promise<unknown[]>;
  onImport: (rows: unknown[], mode: "append" | "replace") => Promise<BulkResult>;
  onDeleteAll: () => Promise<{ deleted: number }>;
  deleting: boolean;
}) {
  const label = entity === "orders" ? "Orders" : "Invoices";
  const fileRef = useRef<HTMLInputElement>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);

  const runImport = async () => {
    if (!file) {
      toast.error("Choose a .xlsx file first");
      return;
    }
    setBusy(true);
    try {
      const rows = await onParse(file);
      if (!rows.length) {
        toast.error("No usable rows found in that file.");
        return;
      }
      const result = await onImport(rows, mode);
      if (result.failed) {
        const first = result.errors[0];
        toast.warning(
          `Imported ${result.imported}, skipped ${result.failed}.` +
            (first ? ` First problem — row ${first.row}: ${first.message}` : ""),
          { duration: 8000 },
        );
      } else {
        toast.success(`Imported ${result.imported} ${entity}.`);
      }
      setImportOpen(false);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      toast.error(apiMessage(error, "Could not read that file"));
    } finally {
      setBusy(false);
    }
  };

  const runWipe = async () => {
    try {
      const { deleted } = await onDeleteAll();
      toast.success(`Deleted ${deleted} ${entity}.`);
      setWipeOpen(false);
    } catch (error) {
      toast.error(apiMessage(error, `Could not delete the ${entity}`));
    }
  };

  return (
    <>
      <div className="mb-4 grid gap-2 rounded-2xl border border-border bg-card p-3 shadow-card sm:flex sm:flex-wrap sm:items-center">
        <span className="hidden text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:block">
          Bulk
        </span>
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="mr-1.5 h-4 w-4" /> Import Excel
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!count}
          onClick={() => onExport().catch(() => toast.error("Export failed"))}
        >
          <Download className="mr-1.5 h-4 w-4" /> Download All ({count})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onTemplate().catch(() => toast.error("Could not build the template"))}
        >
          <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!count}
          className="text-destructive sm:ml-auto"
          onClick={() => setWipeOpen(true)}
        >
          <Trash2 className="mr-1.5 h-4 w-4" /> Delete All
        </Button>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import {label} from Excel</DialogTitle>
            <DialogDescription>
              Use a file exported from this page, or start from the Template. The columns must
              match.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-file">Excel file (.xlsx)</Label>
              <input
                id="bulk-file"
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full cursor-pointer rounded-lg border border-border bg-background p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label>If a record already exists</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as "append" | "replace")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="append">Add new / update matching</SelectItem>
                  <SelectItem value="replace">Delete everything first, then import</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {mode === "append"
                  ? entity === "orders"
                    ? "Rows with an existing Order Code update that order."
                    : "Rows with an existing Invoice Number update that invoice."
                  : `Every existing ${entity.slice(0, -1)} is deleted before importing. This cannot be undone.`}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={runImport} disabled={busy || !file}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={wipeOpen}
        onOpenChange={setWipeOpen}
        title={`Delete all ${count} ${entity}?`}
        description={`Every ${entity.slice(0, -1)} will be permanently removed. This cannot be undone.\n\nDownload a backup first if you might need this data again.`}
        confirmWord="DELETE"
        confirmLabel={`Delete All ${label}`}
        pending={deleting}
        onConfirm={runWipe}
      />
    </>
  );
}
