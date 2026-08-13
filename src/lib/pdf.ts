import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { Invoice, Settings } from "@/lib/data";
import { amountInWords, formatDate, formatNumber, formatPKR } from "@/lib/format";
// PNG logo from assets folder
import CGSLOGO from "../assets/CGSLOGO.png";

const BRAND: [number, number, number] = [0, 0, 150];
const INK: [number, number, number] = [28, 30, 46];
const SOFT: [number, number, number] = [242, 243, 250];
const GRAY: [number, number, number] = [110, 114, 133];

type LoadedLogo = { dataUrl: string; aspect: number };

let logoCache: LoadedLogo | null | undefined;

/**
 * Load the PNG logo imported from the assets folder.
 * Converts it to a PNG data URL for jsPDF.
 */
async function loadLogo(): Promise<LoadedLogo | null> {
  if (logoCache !== undefined) return logoCache;

  try {
    const loaded = await new Promise<LoadedLogo | null>((resolve) => {
      const img = new Image();

      img.onload = () => {
        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;
          if (!width || !height) {
            resolve(null);
            return;
          }

          const aspect = width / height;
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }

          // White background for PDF printing
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          resolve({ dataUrl: canvas.toDataURL("image/png"), aspect });
        } catch (error) {
          console.error("Failed to process logo:", error);
          resolve(null);
        }
      };

      img.onerror = () => {
        console.error("Failed to load CGS logo.");
        resolve(null);
      };

      img.src = CGSLOGO;
    });

    logoCache = loaded;
    return loaded;
  } catch (error) {
    console.error("Logo loading error:", error);
    logoCache = null;
    return null;
  }
}

export async function buildInvoicePdf(
  invoice: Invoice,
  settings: Settings | null,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;

  const logo = await loadLogo();

  const company =
    invoice.from_company || settings?.company_name || "CORPORATE GIFTING SOLUTION";
  const website = invoice.from_website || settings?.website || "";
  const phone = invoice.from_phone || settings?.phone || "";
  const email = invoice.from_email || settings?.email || "";

  /* ------------------------------------------------------------------------ */
  /*                                  HEADER                                  */
  /* ------------------------------------------------------------------------ */
  if (logo) {
    const logoW = 56;
    const logoH = logoW / logo.aspect;
    try {
      doc.addImage(logo.dataUrl, "PNG", M, 9, logoW, logoH);
    } catch (error) {
      console.error("Failed to add logo to PDF:", error);
    }
  } else {
    // Fallback text if PNG somehow fails
    doc.setTextColor(...BRAND);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(company, M, 18);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...BRAND);
  doc.text("INVOICE", pageW - M, 20, { align: "right" });

  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.8);
  doc.line(M, 30, pageW - M, 30);
  doc.setLineWidth(0.2);

  /* ------------------------------------------------------------------------ */
  /*                                 META ROW                                 */
  /* ------------------------------------------------------------------------ */
  // Status is deliberately NOT printed on the invoice — it is an internal
  // workflow field, shown only in the All Invoices list.
  let y = 38;
  doc.setFillColor(...SOFT);
  doc.roundedRect(M, y, pageW - M * 2, 16, 2, 2, "F");

  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.setFont("helvetica", "normal");
  doc.text("INVOICE NUMBER", M + 4, y + 6);
  doc.text("INVOICE DATE", M + 62, y + 6);
  doc.text("DUE DATE", M + 116, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(invoice.invoice_number, M + 4, y + 12);
  doc.text(formatDate(invoice.invoice_date), M + 62, y + 12);
  doc.text(invoice.due_date ? formatDate(invoice.due_date) : "—", M + 116, y + 12);

  /* ------------------------------------------------------------------------ */
  /*                               FROM / BILL TO                             */
  /* ------------------------------------------------------------------------ */
  y += 24;
  const colW = (pageW - M * 2 - 6) / 2;

  const fromLines = [
    company,
    invoice.from_ntn ? `NTN: ${invoice.from_ntn}` : "",
    website,
    phone,
    email,
  ].filter(Boolean);

  const toLines = [
    invoice.to_company || "—",
    invoice.to_contact_person ? `Attn: ${invoice.to_contact_person}` : "",
    invoice.to_address,
    invoice.to_phone,
    invoice.to_email,
    invoice.to_ntn ? `NTN: ${invoice.to_ntn}` : "",
  ].filter(Boolean);

  const boxH = Math.max(fromLines.length, toLines.length) * 4.6 + 14;

  const drawParty = (x: number, title: string, lines: string[]) => {
    doc.setDrawColor(225, 227, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, colW, boxH, 2, 2, "FD");

    doc.setFillColor(...BRAND);
    doc.rect(x, y, colW, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(title, x + 3, y + 4.2);

    doc.setTextColor(...INK);
    doc.setFontSize(9);
    lines.forEach((line, i) => {
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      const text = doc.splitTextToSize(line, colW - 6)[0] ?? line;
      doc.text(text, x + 3, y + 12 + i * 4.6);
    });
  };

  drawParty(M, "FROM", fromLines);
  drawParty(M + colW + 6, "BILL TO", toLines);

  /* ------------------------------------------------------------------------ */
  /*                                  SERVICE                                 */
  /* ------------------------------------------------------------------------ */
  y += boxH + 8;
  doc.setFillColor(...SOFT);
  doc.roundedRect(M, y, pageW - M * 2, 9, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("SERVICE", M + 4, y + 5.8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND);
  doc.text(invoice.service || "—", M + 26, y + 5.8);
  y += 15;

  /* ------------------------------------------------------------------------ */
  /*                                ITEMS TABLE                               */
  /* ------------------------------------------------------------------------ */
  const items = (invoice.invoice_items ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, top: 34, bottom: 26 },
    head: [["S.No", "Items / Description", "Qty", "Per Unit Price", "Total"]],
    body: items.map((it, i) => [
      String(i + 1),
      it.description,
      formatNumber(it.qty),
      formatNumber(it.unit_price),
      formatNumber(it.total),
    ]),
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2.6,
      textColor: INK,
      lineColor: [228, 230, 242],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: BRAND,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    alternateRowStyles: { fillColor: [249, 250, 254] },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 18, halign: "right" },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 34, halign: "right" },
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 26) {
      doc.addPage();
      y = 34;
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                                  TOTALS                                  */
  /* ------------------------------------------------------------------------ */
  ensureSpace(52);
  const totalsW = 84;
  const tx = pageW - M - totalsW;

  const rows: Array<[string, string, boolean]> = [
    ["Subtotal", formatPKR(invoice.subtotal), false],
    ["Delivery Charges", formatPKR(invoice.delivery_charges), false],
    ["Other Charges", formatPKR(invoice.other_charges), false],
    [
      invoice.with_tax ? `Tax (${formatNumber(invoice.tax_rate)}%)` : "Tax",
      formatPKR(invoice.tax_amount),
      false,
    ],
  ];

  doc.setDrawColor(225, 227, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(tx, y, totalsW, rows.length * 6.5 + 15, 2, 2, "FD");

  let ty = y + 6.5;
  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(label, tx + 4, ty);
    doc.setTextColor(...INK);
    doc.text(value, tx + totalsW - 4, ty, { align: "right" });
    ty += 6.5;
  });

  doc.setFillColor(...BRAND);
  doc.roundedRect(tx, ty - 4, totalsW, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("GRAND TOTAL", tx + 4, ty + 3.6);
  doc.text(formatPKR(invoice.grand_total), tx + totalsW - 4, ty + 3.6, { align: "right" });

  /* ------------------------------------------------------------------------ */
  /*                              TOTAL IN WORDS                              */
  /* ------------------------------------------------------------------------ */
  const wordsY = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text("TOTAL IN WORDS", M, wordsY + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  const words = doc.splitTextToSize(amountInWords(invoice.grand_total), tx - M - 6);
  doc.text(words, M, wordsY + 10);

  y = ty + 16;

  /* ------------------------------------------------------------------------ */
  /*                               BANK DETAILS                               */
  /* ------------------------------------------------------------------------ */
  ensureSpace(34);
  const bankH = 26;
  doc.setFillColor(...SOFT);
  doc.roundedRect(M, y, pageW - M * 2, bankH, 2, 2, "F");
  doc.setFillColor(...BRAND);
  doc.rect(M, y, 1.6, bankH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND);
  doc.text("BANK DETAILS", M + 5, y + 6);

  const bank: Array<[string, string]> = [
    ["ACCOUNT TITLE", settings?.bank_title ?? "CORPORATE GIFTING SOLUTION"],
    ["ACCOUNT #", settings?.bank_account ?? "0578345602918"],
    ["IBAN #", settings?.bank_iban ?? "PK24UNIL0109000345602918"],
    ["BANK NAME", settings?.bank_name ?? "UNITED BANK LIMITED"],
  ];

  bank.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = M + 5 + col * ((pageW - M * 2) / 2);
    const by = y + 13 + row * 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(label, bx, by);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(value, bx + 26, by);
  });

  y += bankH + 8;

  /* ------------------------------------------------------------------------ */
  /*                                   NOTES                                  */
  /* ------------------------------------------------------------------------ */
  if (invoice.notes?.trim()) {
    const noteLines = doc.splitTextToSize(invoice.notes.trim(), pageW - M * 2 - 8);
    ensureSpace(noteLines.length * 4.4 + 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text("NOTES", M, y + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(noteLines, M, y + 8);
  }

  /* ------------------------------------------------------------------------ */
  /*                                  FOOTER                                  */
  /* ------------------------------------------------------------------------ */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(225, 227, 240);
    doc.line(M, pageH - 18, pageW - M, pageH - 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND);
    doc.text(company, M, pageH - 12);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.setFontSize(7.5);
    const contactLine = [
      website ? `Web: ${website}` : "",
      phone ? `Tel/WhatsApp: ${phone}` : "",
      email ? `Email: ${email}` : "",
    ]
      .filter(Boolean)
      .join("   |   ");
    doc.text(contactLine, M, pageH - 7.5);
    doc.text(`Page ${p} of ${pages}`, pageW - M, pageH - 7.5, { align: "right" });

    if (p > 1) {
      doc.setFillColor(...BRAND);
      doc.rect(0, 0, pageW, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(`${invoice.invoice_number} — continued`, M, 12);
    }
  }

  return doc;
}

/* -------------------------------------------------------------------------- */
/*                              DOWNLOAD INVOICE                              */
/* -------------------------------------------------------------------------- */
export async function downloadInvoicePdf(invoice: Invoice, settings: Settings | null) {
  const doc = await buildInvoicePdf(invoice, settings);
  doc.save(`${invoice.invoice_number}.pdf`);
}

/* -------------------------------------------------------------------------- */
/*                                PRINT INVOICE                               */
/* -------------------------------------------------------------------------- */
export async function printInvoicePdf(invoice: Invoice, settings: Settings | null) {
  const doc = await buildInvoicePdf(invoice, settings);
  doc.autoPrint();
  const url = doc.output("bloburl");
  window.open(url as unknown as string, "_blank");
}

/* -------------------------------------------------------------------------- */
/*                             GENERIC TABLE PDF                              */
/* -------------------------------------------------------------------------- */
export async function exportTablePdf(options: {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  summary?: Array<[string, string]>;
  filename: string;
  landscape?: boolean;
}) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: options.landscape ? "landscape" : "portrait",
  });
  const pageW = doc.internal.pageSize.getWidth();

  // Same PNG logo from assets
  const logo = await loadLogo();

  /* ------------------------------ REPORT HEADER ----------------------------- */
  if (logo) {
    const logoW = 44;
    const logoH = logoW / logo.aspect;
    try {
      doc.addImage(logo.dataUrl, "PNG", 12, 4, logoW, logoH);
    } catch (error) {
      console.error("Failed to add report logo:", error);
    }
  }

  doc.setTextColor(...BRAND);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(options.title, logo ? 60 : 12, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(options.subtitle ?? "CGS Finance System", logo ? 60 : 12, 18.5);
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.6);
  doc.line(12, 24, pageW - 12, 24);
  doc.setLineWidth(0.2);

  /* --------------------------------- SUMMARY -------------------------------- */
  let startY = 32;
  if (options.summary?.length) {
    doc.setFillColor(...SOFT);
    doc.roundedRect(12, startY - 4, pageW - 24, 14, 2, 2, "F");
    options.summary.forEach(([label, value], i) => {
      const x = 16 + i * ((pageW - 32) / options.summary!.length);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(label, x, startY + 1);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(value, x, startY + 7);
    });
    startY += 16;
  }

  /* ---------------------------------- TABLE --------------------------------- */
  autoTable(doc, {
    startY,
    margin: { left: 12, right: 12 },
    head: [options.columns],
    body: options.rows.map((row) => row.map((cell) => String(cell))),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2, textColor: INK },
    headStyles: {
      fillColor: BRAND,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [249, 250, 254] },
  });

  doc.save(`${options.filename}.pdf`);
}
