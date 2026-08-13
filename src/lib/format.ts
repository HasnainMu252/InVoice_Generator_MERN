export function toNum(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function formatPKR(value: unknown): string {
  const n = toNum(value);
  return `PKR ${n.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumber(value: unknown): string {
  const n = toNum(value);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function monthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below1000(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]!} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)]!);
    n %= 10;
    if (n) parts.push(ONES[n]!);
  } else if (n > 0) {
    parts.push(ONES[n]!);
  }
  return parts.join(" ");
}

/** Indian/Pakistani numbering: Arab (10^9), Crore (10^7), Lakh (10^5), Thousand, Hundred */
function integerToWords(n: number): string {
  if (n === 0) return "Zero";
  const units: Array<[number, string]> = [
    [1_000_000_000, "Arab"],
    [10_000_000, "Crore"],
    [100_000, "Lakh"],
    [1_000, "Thousand"],
  ];
  const parts: string[] = [];
  let rest = n;
  for (const [value, name] of units) {
    if (rest >= value) {
      const count = Math.floor(rest / value);
      rest %= value;
      parts.push(`${integerToWords(count)} ${name}`);
    }
  }
  if (rest > 0) parts.push(below1000(rest));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function amountInWords(value: unknown): string {
  const n = Math.max(0, toNum(value));
  const rupees = Math.floor(n);
  const paisa = Math.round((n - rupees) * 100);
  let out = `${integerToWords(rupees)} Pakistani Rupees`;
  if (paisa > 0) out += ` and ${integerToWords(paisa)} Paisa`;
  return `${out} Only`;
}
