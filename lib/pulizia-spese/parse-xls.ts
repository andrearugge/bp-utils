import * as XLSX from "xlsx";
import { SpesaRow } from "./types";

// FattureInCloud column positions (0-based, i.e. A=0, H=7, Q=16, S=18)
const COL = {
  DATA:        0,  // A
  FORNITORE:   7,  // H
  DESCRIZIONE: 16, // Q
  IMPONIBILE:  18, // S
} as const;

// Detect the first data row by finding the header row (contains "Data" in col A)
// then returning the row after it.
function findDataStartRow(ws: XLSX.WorkSheet, maxRow: number): number {
  for (let r = 0; r <= Math.min(maxRow, 20); r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: COL.DATA })];
    if (cell && String(cell.v ?? "").trim().toLowerCase() === "data") {
      return r + 1;
    }
  }
  // Fallback: assume header is at row 4, data starts at row 5
  return 5;
}

function formatDate(cell: XLSX.CellObject | undefined): string {
  if (!cell) return "";
  if (cell.t === "d" && cell.v instanceof Date) {
    const d = cell.v;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }
  return String(cell.v ?? "");
}

function cellStr(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v == null) return "";
  return String(cell.v).trim();
}

export interface ParseResult {
  rows: SpesaRow[];
  error?: string;
}

export function parseXls(buffer: ArrayBuffer): ParseResult {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "array", cellDates: true });
  } catch {
    return { rows: [], error: "Impossibile leggere il file XLS." };
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { rows: [], error: "Nessun foglio trovato nel file." };

  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const dataStart = findDataStartRow(ws, range.e.r);

  const rows: SpesaRow[] = [];
  let idx = 0;

  for (let r = dataStart; r <= range.e.r; r++) {
    const getCell = (col: number) => ws[XLSX.utils.encode_cell({ r, c: col })];

    const imponibileRaw = cellStr(getCell(COL.IMPONIBILE));
    if (!imponibileRaw) continue; // skip empty rows

    rows.push({
      idx: idx++,
      data: formatDate(getCell(COL.DATA)),
      fornitore: cellStr(getCell(COL.FORNITORE)),
      descrizione: cellStr(getCell(COL.DESCRIZIONE)),
      imponibile: imponibileRaw,
    });
  }

  if (rows.length === 0) return { rows: [], error: "Nessuna riga trovata nel file." };
  return { rows };
}
