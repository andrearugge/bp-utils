// Tipi e tassonomia per il classificatore della tab "Acquisti - ACT".
// La tassonomia riflette i valori presenti nel Business Plan 2026:
// se sul foglio compaiono valori nuovi vanno aggiunti qui (const assertion → il
// compilatore segnala ogni punto da aggiornare).

export const CENTRI_COSTO = ["BLT", "BLM", "BLC", "BLS", "Cross BL"] as const;
export type CentroCosto = (typeof CENTRI_COSTO)[number];

export const CATEGORIE = [
  "Spese Generali",
  "Software & Infrastruttura",
  "Advertising & Influencer",
  "Collaborazioni",
  "Sede & Utenze",
  "Leasing & Noleggi",
] as const;
export type Categoria = (typeof CATEGORIE)[number];

export const TYPES = ["Material", "Third Party", "Labour"] as const;
export type Type = (typeof TYPES)[number];

/** Percentuale Direct: sul foglio è "0%" o "100%". Indirect è ArrayFormula derivata (mai scriverla). */
export const DIRECT_VALUES = [0, 100] as const;
export type Direct = (typeof DIRECT_VALUES)[number];

export const TAG_SOURCES = ["manual", "auto", "confirmed"] as const;
export type TagSource = (typeof TAG_SOURCES)[number];

/** Riga della tab Acquisti - ACT (dall'export CSV o dalla lettura del foglio). */
export interface AcquistoRow {
  /** Numero riga stile foglio (header = 1, prima riga dati = 2) — per riferire la riga sul foglio. */
  rowIndex: number;
  data: string; // DD/MM/YYYY come sul foglio
  dataISO: string; // YYYY-MM-DD, per ordinamenti e decadimento recency
  centroCosto: CentroCosto | null;
  categoria: Categoria | null;
  type: Type | null;
  direct: Direct | null;
  indirect: Direct | null; // derivata, solo lettura
  fornitore: string;
  descrizione: string;
  imponibile: number; // in EUR
  noteAdmin: string;
  tagSource: TagSource | null; // assente nell'export CSV, presente sul foglio
}

/** Riga completamente taggata sui 3 assi manuali + Direct: utilizzabile come ground truth. */
export interface AcquistoRowTaggata extends AcquistoRow {
  centroCosto: CentroCosto;
  categoria: Categoria;
  type: Type;
  direct: Direct;
}

export function isRowTaggata(row: AcquistoRow): row is AcquistoRowTaggata {
  return (
    row.centroCosto !== null &&
    row.categoria !== null &&
    row.type !== null &&
    row.direct !== null
  );
}

/** I 4 assi da classificare. */
export interface Classificazione {
  centroCosto: CentroCosto;
  categoria: Categoria;
  type: Type;
  direct: Direct;
}

export type Asse = keyof Classificazione;
export const ASSI: readonly Asse[] = ["centroCosto", "categoria", "type", "direct"] as const;

export type MetodoClassificazione = "esatto" | "fuzzy" | "regola" | "llm";

export type LivelloConfidence = "alta" | "media" | "bassa";

/** Suggerimento di classificazione per una riga non taggata. */
export interface Suggerimento {
  rowIndex: number;
  valori: Classificazione;
  /** Score complessivo 0–1 (composizione evidence-based, vedi confidence.ts). */
  score: number;
  livello: LivelloConfidence;
  metodo: MetodoClassificazione;
  /** Evidenza leggibile: match storico usato, regola applicata, motivazione LLM. */
  evidenza: string;
  /** Similarità fornitore del miglior match storico (1 = esatto normalizzato). */
  similarita: number;
  /** Numero di righe storiche a supporto del suggerimento. */
  occorrenze: number;
}

export type TipoAnomalia =
  | "loo-mismatch" // il classificatore predice valori diversi da quelli sul foglio
  | "importo-fuori-range" // importo anomalo rispetto allo storico del fornitore
  | "tag-incoerenti" // fornitore con combinazioni di tag incoerenti senza regola
  | "combinazione-inedita"; // Categoria×Centro costo mai vista nel ground truth

export type Severita = "alta" | "media" | "bassa";

/** Possibile errore rilevato su una riga già taggata. */
export interface Anomalia {
  rowIndex: number;
  tipo: TipoAnomalia;
  motivazione: string;
  severita: Severita;
  /** Valori attesi dal check, quando applicabile (es. predizione LOO). */
  valoriAttesi?: Partial<Classificazione>;
}
