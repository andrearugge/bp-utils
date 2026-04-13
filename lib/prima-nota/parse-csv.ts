import { PrimaNotaRow } from "./types";
import { classify, buildOutput } from "./classify";

// ─── CSV parser ──────────────────────────────────────────────────────────────

function detectSeparator(firstLine: string): "," | ";" {
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

/**
 * Parses a CSV string into an array of rows (each row is an array of strings).
 * Handles quoted fields (including commas and newlines inside quotes).
 */
function parseRawCsv(text: string, sep: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const n = text.length;

  while (i < n) {
    const row: string[] = [];

    while (i < n) {
      if (text[i] === '"') {
        // Quoted field
        let field = "";
        i++; // skip opening quote
        while (i < n) {
          if (text[i] === '"') {
            if (i + 1 < n && text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            field += text[i++];
          }
        }
        row.push(field);
      } else {
        // Unquoted field
        let field = "";
        while (i < n && text[i] !== sep && text[i] !== "\n" && text[i] !== "\r") {
          field += text[i++];
        }
        row.push(field.trim());
      }

      if (i < n && text[i] === sep) {
        i++; // skip separator — more fields follow
      } else {
        break; // end of row
      }
    }

    // Skip line ending
    if (i < n && text[i] === "\r") i++;
    if (i < n && text[i] === "\n") i++;

    // Skip empty rows
    if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

// ─── Column mapping ──────────────────────────────────────────────────────────

const COLUMN_NAMES = {
  data: "Data registrazione",
  rawDesc: "Descrizione dell'operazione",
  importo: "Importo dare",
  sottoconto: "Descrizione sottoconto",
  causale: "Causale contabile",
} as const;

function findColumnIndex(headers: string[], name: string): number {
  const idx = headers.findIndex(
    (h) => h.trim().toLowerCase() === name.toLowerCase()
  );
  return idx;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export interface ParseResult {
  rows: PrimaNotaRow[];
  skippedCount: number;
  error?: string;
}

/**
 * Parses a CSV text from the commercialista and returns classified PrimaNotaRow[].
 */
export function parsePrimaNotaCsv(text: string): ParseResult {
  // Strip UTF-8 BOM if present
  const clean = text.startsWith("\uFEFF") ? text.slice(1) : text;

  // Detect separator from first line
  const firstNewline = clean.indexOf("\n");
  const firstLine = firstNewline === -1 ? clean : clean.slice(0, firstNewline);
  const sep = detectSeparator(firstLine);

  const allRows = parseRawCsv(clean, sep);
  if (allRows.length === 0) {
    return { rows: [], skippedCount: 0, error: "Il file CSV è vuoto." };
  }

  const headers = allRows[0];

  // Locate required columns
  const colData = findColumnIndex(headers, COLUMN_NAMES.data);
  const colRawDesc = findColumnIndex(headers, COLUMN_NAMES.rawDesc);
  const colImporto = findColumnIndex(headers, COLUMN_NAMES.importo);
  const colSottoconto = findColumnIndex(headers, COLUMN_NAMES.sottoconto);
  const colCausale = findColumnIndex(headers, COLUMN_NAMES.causale);

  if (colRawDesc === -1 || colSottoconto === -1) {
    return {
      rows: [],
      skippedCount: 0,
      error: `Colonne obbligatorie non trovate. Trovate: ${headers.join(", ")}`,
    };
  }

  const rows: PrimaNotaRow[] = [];
  let skippedCount = 0;

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    const rawDesc = colRawDesc !== -1 ? (row[colRawDesc] ?? "") : "";
    const sottoconto = colSottoconto !== -1 ? (row[colSottoconto] ?? "") : "";

    // Skip rows with no meaningful content
    if (!rawDesc && !sottoconto) {
      skippedCount++;
      continue;
    }

    const data = colData !== -1 ? (row[colData] ?? "") : "";
    const importo = colImporto !== -1 ? (row[colImporto] ?? "") : "";
    const causale = colCausale !== -1 ? (row[colCausale] ?? "") : "";

    const { azione, motivo } = classify(rawDesc, sottoconto);
    const { fornitore, descrizione } = buildOutput(rawDesc, sottoconto);

    rows.push({
      idx: i - 1, // 0-based index among data rows
      data,
      rawDesc,
      importo,
      sottoconto,
      causale,
      azione,
      motivo,
      fornitore,
      descrizione,
    });
  }

  return { rows, skippedCount };
}
