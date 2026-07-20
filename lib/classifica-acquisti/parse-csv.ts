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

/**
 * Parsa l'export CSV della tab Acquisti - ACT. Il mapping colonne è per nome
 * di header, non per posizione; la colonna "Tag Source" è opzionale
 * (assente nell'export, presente sul foglio).
 */
export function parseAcquistiCsv(content: string): RisultatoParse {
  const records = parseCsvRecords(content);
  if (records.length === 0) return { rows: [], avvisi: [] };

  const header = records[0].map((h) => h.trim());
  const col = (name: string) => header.indexOf(name);
  const idx = {
    data: col("Data"),
    centroCosto: col("Centro costo"),
    categoria: col("Categoria"),
    type: col("Type"),
    direct: col("Direct"),
    indirect: col("Indirect"),
    fornitore: col("Fornitore"),
    descrizione: col("Descrizione"),
    imponibile: col("Imponibile"),
    noteAdmin: col("Note Admin"),
    tagSource: col("Tag Source"),
  };
  const obbligatorie = ["Data", "Centro costo", "Categoria", "Type", "Direct", "Fornitore", "Descrizione", "Imponibile"];
  const mancanti = obbligatorie.filter((name) => col(name) === -1);
  if (mancanti.length > 0) {
    throw new Error(`Colonne mancanti nell'export: ${mancanti.join(", ")}`);
  }

  const rows: AcquistoRow[] = [];
  const avvisi: AvvisoParse[] = [];
  const get = (record: string[], i: number) => (i >= 0 && i < record.length ? record[i] : "");

  for (let r = 1; r < records.length; r++) {
    const record = records[r];
    const rowIndex = r + 1; // numero riga stile foglio (header = 1)

    if (record.every((f) => f.trim() === "")) continue;

    const dataRaw = get(record, idx.data).trim();
    const imponibileRaw = get(record, idx.imponibile).trim();
    if (dataRaw === "" && imponibileRaw === "") {
      avvisi.push({ rowIndex, motivo: "riga senza data né importo, saltata" });
      continue;
    }

    const dataISO = parseDataISO(dataRaw);
    if (dataISO === null) {
      avvisi.push({ rowIndex, motivo: `data non riconosciuta: "${dataRaw}", riga saltata` });
      continue;
    }
    const imponibile = parseImporto(imponibileRaw);
    if (imponibile === null) {
      avvisi.push({ rowIndex, motivo: `importo non riconosciuto: "${imponibileRaw}", riga saltata` });
      continue;
    }

    const centroCosto = parseEnum<CentroCosto>(get(record, idx.centroCosto), CENTRI_COSTO);
    const categoria = parseEnum<Categoria>(get(record, idx.categoria), CATEGORIE);
    const type = parseEnum<Type>(get(record, idx.type), TYPES);
    const tagSource = parseEnum<TagSource>(get(record, idx.tagSource), TAG_SOURCES);
    for (const [nome, res] of [
      ["Centro costo", centroCosto],
      ["Categoria", categoria],
      ["Type", type],
      ["Tag Source", tagSource],
    ] as const) {
      if (res.fuoriTassonomia) {
        avvisi.push({ rowIndex, motivo: `valore fuori tassonomia in ${nome}, trattato come vuoto` });
      }
    }

    rows.push({
      rowIndex,
      data: dataRaw,
      dataISO,
      centroCosto: centroCosto.valore,
      categoria: categoria.valore,
      type: type.valore,
      direct: parsePercent(get(record, idx.direct)),
      indirect: parsePercent(get(record, idx.indirect)),
      fornitore: decodeHtmlEntities(get(record, idx.fornitore)).trim(),
      descrizione: decodeHtmlEntities(get(record, idx.descrizione)).trim(),
      imponibile,
      noteAdmin: get(record, idx.noteAdmin).trim(),
      tagSource: tagSource.valore,
    });
  }

  return { rows, avvisi };
}
