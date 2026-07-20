import { PrimaNotaRow } from "./types";
import { classify, buildOutput, collectAdminSurnames } from "./classify";

// ─── CSV parser ──────────────────────────────────────────────────────────────

// ─── Parsing importi ─────────────────────────────────────────────────────────

/**
 * Analizza un importo testuale in un numero, indipendentemente dal formato
 * di provenienza: simbolo di valuta, separatore delle migliaia e decimale
 * in stile italiano (1.054,89) o anglosassone (1,054.89), con o senza
 * separatore delle migliaia. Es: "€ 1,054.89" / "1.054,89" / "1054.89" → 1054.89
 */
function parseImporto(raw: string): number {
  let s = raw.trim().replace(/[^0-9,.\-()]/g, "");
  if (!s) return NaN;

  const negative = s.includes("-") || (s.startsWith("(") && s.endsWith(")"));
  s = s.replace(/[()\-]/g, "");

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    // Presenti entrambi: il più a destra è il separatore decimale, l'altro le migliaia
    s = lastComma > lastDot
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(/,/g, "");
  } else if (lastComma !== -1) {
    // Solo virgola: decimale se seguita da 1-2 cifre, altrimenti migliaia
    const decimals = s.length - lastComma - 1;
    s = decimals <= 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if (lastDot !== -1) {
    const decimals = s.length - lastDot - 1;
    if (decimals > 2) s = s.replace(/\./g, "");
  }

  const n = parseFloat(s);
  return negative ? -Math.abs(n) : n;
}

/** Riformatta un importo in formato italiano pulito (virgola decimale, senza separatore delle migliaia) */
function formatImportoItaliano(n: number): string {
  if (Number.isNaN(n)) return "";
  return n.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  });
}

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

  // Primo passaggio: individua i cognomi amministratore dai sottoconti
  // inequivocabili del file, per disambiguare le righe "Contributi INPS X".
  const adminSurnames = collectAdminSurnames(
    allRows.slice(1).map((row) => (colSottoconto !== -1 ? (row[colSottoconto] ?? "") : ""))
  );

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
    const importoRaw = colImporto !== -1 ? (row[colImporto] ?? "") : "";
    const importo = importoRaw ? formatImportoItaliano(parseImporto(importoRaw)) : "";
    const causale = colCausale !== -1 ? (row[colCausale] ?? "") : "";

    const { azione, motivo } = classify(rawDesc, sottoconto);
    const { fornitore, descrizione } = buildOutput(rawDesc, sottoconto, adminSurnames);

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
