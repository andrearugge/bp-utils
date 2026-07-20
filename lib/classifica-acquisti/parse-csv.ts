// Parser dell'export CSV della tab "Acquisti - ACT".
// Formati del foglio: date DD/MM/YYYY, importi "€ 1.234,56", percentuali "0%"/"100%",
// entità HTML nei nomi fornitore (es. "&amp;"). Molte righe ricorrenti (affitto,
// stipendi, bolli) hanno Fornitore vuoto e solo la Descrizione come identificativo.

import {
  AcquistoRow,
  CentroCosto,
  Categoria,
  Type,
  Direct,
  TagSource,
  CENTRI_COSTO,
  CATEGORIE,
  TYPES,
  TAG_SOURCES,
} from "./types";

export interface AvvisoParse {
  /** Numero riga stile foglio (header = 1). */
  rowIndex: number;
  motivo: string;
}

export interface RisultatoParse {
  rows: AcquistoRow[];
  /** Righe saltate (vuote o senza dati minimi) e valori fuori tassonomia. */
  avvisi: AvvisoParse[];
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
};

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(?:amp|quot|#39|apos|lt|gt|nbsp);/g, (m) => ENTITIES[m]);
}

/** "€ 1.234,56" → 1234.56. Ritorna null se non riconosciuto. */
export function parseImporto(value: string): number | null {
  const cleaned = value.replace(/€|\s/g, "");
  if (!/^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+(,\d+)?$/.test(cleaned)) return null;
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** "DD/MM/YYYY" → "YYYY-MM-DD". Ritorna null se non valida. */
export function parseDataISO(value: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/** "0%" | "100%" → 0 | 100; vuoto o altro → null. */
export function parsePercent(value: string): Direct | null {
  const v = value.trim();
  if (v === "0%" || v === "0") return 0;
  if (v === "100%" || v === "100") return 100;
  return null;
}

function parseEnum<T extends string>(
  value: string,
  valid: readonly T[],
): { valore: T | null; fuoriTassonomia: boolean } {
  const v = decodeHtmlEntities(value).trim();
  if (v === "") return { valore: null, fuoriTassonomia: false };
  const match = valid.find((x) => x === v);
  return { valore: match ?? null, fuoriTassonomia: match === undefined };
}

/** Parser RFC 4180 minimale: campi quotati con virgole e doppi apici interni. */
export function parseCsvRecords(content: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  const text = content.replace(/^﻿/, "");

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      field = "";
      record = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}

export interface RisultatoCampi {
  /** null se la riga va scartata (vedi avvisi per il motivo). */
  row: AcquistoRow | null;
  /** Motivi di avviso senza rowIndex: il chiamante lo associa (CSV o foglio). */
  avvisi: string[];
}

/**
 * Mappa i campi di una riga (indicizzati per nome colonna, sia da CSV che da
 * lettura del foglio) in un `AcquistoRow`. Nucleo condiviso da `parseAcquistiCsv`
 * e da chi legge la tab direttamente dal foglio (es. il backfill di Fase 2).
 */
export function parseAcquistoFields(fields: Record<string, string>, rowIndex: number): RisultatoCampi {
  const get = (name: string) => fields[name] ?? "";
  const avvisi: string[] = [];

  const dataRaw = get("Data").trim();
  const imponibileRaw = get("Imponibile").trim();
  if (dataRaw === "" && imponibileRaw === "") {
    return { row: null, avvisi: ["riga senza data né importo, saltata"] };
  }

  const dataISO = parseDataISO(dataRaw);
  if (dataISO === null) {
    return { row: null, avvisi: [`data non riconosciuta: "${dataRaw}", riga saltata`] };
  }
  const imponibile = parseImporto(imponibileRaw);
  if (imponibile === null) {
    return { row: null, avvisi: [`importo non riconosciuto: "${imponibileRaw}", riga saltata`] };
  }

  const centroCosto = parseEnum<CentroCosto>(get("Centro costo"), CENTRI_COSTO);
  const categoria = parseEnum<Categoria>(get("Categoria"), CATEGORIE);
  const type = parseEnum<Type>(get("Type"), TYPES);
  const tagSource = parseEnum<TagSource>(get("Tag Source"), TAG_SOURCES);
  for (const [nome, res] of [
    ["Centro costo", centroCosto],
    ["Categoria", categoria],
    ["Type", type],
    ["Tag Source", tagSource],
  ] as const) {
    if (res.fuoriTassonomia) {
      avvisi.push(`valore fuori tassonomia in ${nome}, trattato come vuoto`);
    }
  }

  const row: AcquistoRow = {
    rowIndex,
    data: dataRaw,
    dataISO,
    centroCosto: centroCosto.valore,
    categoria: categoria.valore,
    type: type.valore,
    direct: parsePercent(get("Direct")),
    indirect: parsePercent(get("Indirect")),
    fornitore: decodeHtmlEntities(get("Fornitore")).trim(),
    descrizione: decodeHtmlEntities(get("Descrizione")).trim(),
    imponibile,
    noteAdmin: get("Note Admin").trim(),
    tagSource: tagSource.valore,
  };
  return { row, avvisi };
}

/**
 * Parsa l'export CSV della tab Acquisti - ACT. Il mapping colonne è per nome
 * di header, non per posizione; la colonna "Tag Source" è opzionale
 * (assente nell'export, presente sul foglio).
 */
export function parseAcquistiCsv(content: string): RisultatoParse {
  const records = parseCsvRecords(content);
  if (records.length === 0) return { rows: [], avvisi: [] };

  const header = records[0].map((h) => h.trim());
  const obbligatorie = ["Data", "Centro costo", "Categoria", "Type", "Direct", "Fornitore", "Descrizione", "Imponibile"];
  const mancanti = obbligatorie.filter((name) => !header.includes(name));
  if (mancanti.length > 0) {
    throw new Error(`Colonne mancanti nell'export: ${mancanti.join(", ")}`);
  }

  const rows: AcquistoRow[] = [];
  const avvisi: AvvisoParse[] = [];

  for (let r = 1; r < records.length; r++) {
    const record = records[r];
    const rowIndex = r + 1; // numero riga stile foglio (header = 1)

    if (record.every((f) => f.trim() === "")) continue;

    const fields: Record<string, string> = {};
    header.forEach((h, i) => {
      fields[h] = record[i] ?? "";
    });

    const { row, avvisi: rowAvvisi } = parseAcquistoFields(fields, rowIndex);
    for (const motivo of rowAvvisi) avvisi.push({ rowIndex, motivo });
    if (row) rows.push(row);
  }

  return { rows, avvisi };
}
