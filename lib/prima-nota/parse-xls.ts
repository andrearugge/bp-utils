import * as XLSX from "xlsx";
import { classifyTable, ParseResult } from "./parse-csv";

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function cellToString(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return formatDate(v);
  // Importi: arrotonda ai centesimi, così il parser importi non scambia
  // eventuali decimali lunghi (es. 0.125) per separatori delle migliaia
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v).trim();
}

/**
 * Legge l'Excel della commercialista (.xlsx / .xls, primo foglio) e lo
 * classifica con le stesse regole del CSV.
 */
export function parsePrimaNotaXls(buffer: ArrayBuffer): ParseResult {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "array", cellDates: true });
  } catch {
    return { rows: [], skippedCount: 0, error: "Impossibile leggere il file Excel." };
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { rows: [], skippedCount: 0, error: "Nessun foglio trovato nel file." };

  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" });
  const allRows = raw
    .map((row) => row.map(cellToString))
    .filter((row) => row.some((c) => c !== ""));
  if (allRows.length === 0) {
    return { rows: [], skippedCount: 0, error: "Il file Excel è vuoto." };
  }

  return classifyTable(allRows);
}
