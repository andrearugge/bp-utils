// Normalizzazione del nome fornitore per il lookup storico: lo stesso fornitore
// compare nell'export con varianti di maiuscole, forme giuridiche e punteggiatura
// (es. "PORSCHE SALES & MARKETPLACE GMBH" vs "Porsche Sales & Marketplace GmbH").

import { decodeHtmlEntities } from "./parse-csv";

// Forme giuridiche e suffissi societari, italiani ed esteri. Rimossi solo come
// parole intere, ovunque compaiano nel nome ("Sas di Bontempi Michele & C.").
const FORME_GIURIDICHE = new Set([
  "srl", "srls", "spa", "snc", "sas", "sapa", "ss", "sc", "scarl", "scrl",
  "societa", "cooperativa", "coop",
  "ltd", "llc", "llp", "inc", "corp", "co", "plc", "gmbh", "ag", "kg",
  "sarl", "sa", "sl", "slu", "sro", "bv", "nv", "oy", "ab", "as", "aps", "ug", "pty",
  "limited", "incorporated", "corporation", "company", "unipersonale",
]);

// Congiunzioni e riempitivi che restano dopo aver tolto le forme giuridiche
// ("Tecnodue di Bertuzzi & C. snc" → senza "di"/"c" resta il nome utile).
const STOPWORDS = new Set(["di", "e", "and", "c", "the"]);

/**
 * Normalizza un nome fornitore: lowercase, senza accenti, entità HTML decodificate,
 * punteggiatura → spazio, forme giuridiche e stopword rimosse, spazi compattati.
 * Se la rimozione svuoterebbe il nome (es. fornitore che si chiama "SS"), la salta.
 */
export function normalizeFornitore(nome: string): string {
  const base = decodeHtmlEntities(nome)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (base === "") return "";

  const tokens = base.split(" ");
  // Le singole lettere alfabetiche sono residui di sigle puntate ("S.R.L." → s r l).
  const filtered = tokens.filter(
    (t) => !FORME_GIURIDICHE.has(t) && !STOPWORDS.has(t) && !(t.length === 1 && /[a-z]/.test(t)),
  );
  return (filtered.length > 0 ? filtered : tokens).join(" ");
}

const MESI = new Set([
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
]);

/**
 * Chiave di lookup per una riga: fornitore normalizzato, oppure la descrizione
 * normalizzata quando il fornitore è vuoto (righe ricorrenti tipo affitto,
 * stipendi, bolli hanno solo la Descrizione come identificativo). Nelle chiavi
 * da descrizione i nomi di mese vengono rimossi, così "Stipendio dipendente -
 * Gennaio" e "... - Febbraio" collassano sulla stessa chiave.
 */
export function lookupKey(fornitore: string, descrizione: string): string {
  const f = normalizeFornitore(fornitore);
  if (f !== "") return f;
  const d = normalizeFornitore(descrizione);
  const senzaMesi = tokens(d).filter((t) => !MESI.has(t));
  return senzaMesi.length > 0 ? senzaMesi.join(" ") : d;
}

/** Token del nome normalizzato, per similarità token-set. */
export function tokens(normalized: string): string[] {
  return normalized === "" ? [] : normalized.split(" ");
}
