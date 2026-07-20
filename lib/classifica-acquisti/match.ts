// Lookup storico: dato un fornitore (o descrizione, per righe senza fornitore),
// propone la classificazione votando le combinazioni di tag viste nel ground truth.
// Voto di maggioranza pesato per recency (decadimento esponenziale sulla distanza
// in giorni dalla riga da classificare) e, per i match fuzzy, per similarità.
// A valle, regole deterministiche correggono i casi noti.

import {
  AcquistoRow,
  AcquistoRowTaggata,
  Asse,
  ASSI,
  Classificazione,
  MetodoClassificazione,
} from "./types";
import { lookupKey } from "./normalize";
import { similarity } from "./fuzzy";

export interface MatchOptions {
  /** Emivita del decadimento recency, in giorni. */
  halfLifeDays: number;
  /** Similarità minima perché un match fuzzy sia considerato. */
  minFuzzySimilarity: number;
  /** Riga da escludere dal voto (per leave-one-out). */
  escludiRowIndex?: number;
}

export const DEFAULT_MATCH_OPTIONS: MatchOptions = {
  halfLifeDays: 90,
  minFuzzySimilarity: 0.85,
};

export interface MatchResult {
  valori: Classificazione;
  metodo: Extract<MetodoClassificazione, "esatto" | "fuzzy">;
  /** Chiave storica usata e similarità con la chiave della riga (1 = esatta). */
  chiave: string;
  similarita: number;
  /** Righe storiche che hanno votato. */
  occorrenze: number;
  /** Quota di voto pesato della combinazione vincente (0–1: 1 = storico unanime). */
  consenso: number;
  /** Consenso per singolo asse (un fornitore può variare solo su un asse). */
  consensoPerAsse: Record<Asse, number>;
  /** Regole deterministiche applicate dopo il voto. */
  regoleApplicate: string[];
}

export type Lookup = Map<string, AcquistoRowTaggata[]>;

/** Raggruppa il ground truth per chiave di lookup (fornitore o descrizione normalizzati). */
export function buildLookup(groundTruth: AcquistoRowTaggata[]): Lookup {
  const lookup: Lookup = new Map();
  for (const row of groundTruth) {
    const key = lookupKey(row.fornitore, row.descrizione);
    if (key === "") continue;
    const list = lookup.get(key);
    if (list) list.push(row);
    else lookup.set(key, [row]);
  }
  return lookup;
}

function giorniTra(aISO: string, bISO: string): number {
  const ms = Math.abs(new Date(aISO).getTime() - new Date(bISO).getTime());
  return ms / 86_400_000;
}

interface Voto {
  valori: Classificazione;
  peso: number;
}

function comboKey(c: Classificazione): string {
  return `${c.centroCosto}|${c.categoria}|${c.type}|${c.direct}`;
}

/**
 * Vota le combinazioni di una lista di righe storiche. Ritorna la combinazione
 * vincente, il consenso complessivo e per asse.
 */
export function vota(voti: Voto[]): {
  valori: Classificazione;
  consenso: number;
  consensoPerAsse: Record<Asse, number>;
} {
  const totale = voti.reduce((s, v) => s + v.peso, 0);

  const perCombo = new Map<string, { valori: Classificazione; peso: number }>();
  for (const v of voti) {
    const k = comboKey(v.valori);
    const e = perCombo.get(k);
    if (e) e.peso += v.peso;
    else perCombo.set(k, { valori: v.valori, peso: v.peso });
  }
  let vincente = [...perCombo.values()][0];
  for (const e of perCombo.values()) if (e.peso > vincente.peso) vincente = e;

  const consensoPerAsse = {} as Record<Asse, number>;
  for (const asse of ASSI) {
    let pesoAsse = 0;
    for (const v of voti) if (v.valori[asse] === vincente.valori[asse]) pesoAsse += v.peso;
    consensoPerAsse[asse] = totale > 0 ? pesoAsse / totale : 0;
  }

  return {
    valori: { ...vincente.valori },
    consenso: totale > 0 ? vincente.peso / totale : 0,
    consensoPerAsse,
  };
}

function pesoRecency(row: AcquistoRowTaggata, targetISO: string, halfLifeDays: number): number {
  return Math.pow(0.5, giorniTra(row.dataISO, targetISO) / halfLifeDays);
}

/** Regole deterministiche a valle del voto. Mutano `valori` e tornano le regole applicate. */
export function applicaRegole(valori: Classificazione): string[] {
  const applicate: string[] = [];
  if (valori.categoria === "Leasing & Noleggi" && valori.type !== "Material") {
    valori.type = "Material";
    applicate.push("Leasing & Noleggi → Type Material");
  }
  if (valori.centroCosto === "Cross BL" && valori.direct !== 0) {
    valori.direct = 0;
    applicate.push("Cross BL → Direct 0%");
  }
  return applicate;
}

/**
 * Cerca la classificazione per una riga: match esatto sulla chiave normalizzata,
 * altrimenti fuzzy sulle chiavi storiche sopra la soglia. Ritorna null se non
 * c'è storico utilizzabile (→ fallback LLM).
 */
export function matchRow(
  row: AcquistoRow,
  lookup: Lookup,
  options: MatchOptions = DEFAULT_MATCH_OPTIONS,
): MatchResult | null {
  const key = lookupKey(row.fornitore, row.descrizione);
  if (key === "") return null;

  const usabile = (r: AcquistoRowTaggata) => r.rowIndex !== options.escludiRowIndex;

  // 1. match esatto sulla chiave normalizzata
  const esatte = (lookup.get(key) ?? []).filter(usabile);
  if (esatte.length > 0) {
    const voti = esatte.map((r) => ({
      valori: { centroCosto: r.centroCosto, categoria: r.categoria, type: r.type, direct: r.direct },
      peso: pesoRecency(r, row.dataISO, options.halfLifeDays),
    }));
    const esito = vota(voti);
    const regoleApplicate = applicaRegole(esito.valori);
    return {
      valori: esito.valori,
      metodo: "esatto",
      chiave: key,
      similarita: 1,
      occorrenze: esatte.length,
      consenso: esito.consenso,
      consensoPerAsse: esito.consensoPerAsse,
      regoleApplicate,
    };
  }

  // 2. fuzzy: tutte le chiavi sopra soglia votano, pesate anche per similarità
  let migliore: { chiave: string; sim: number } | null = null;
  const voti: Voto[] = [];
  let occorrenze = 0;
  for (const [k, righe] of lookup) {
    const sim = similarity(key, k);
    if (sim < options.minFuzzySimilarity) continue;
    const valide = righe.filter(usabile);
    if (valide.length === 0) continue;
    if (migliore === null || sim > migliore.sim) migliore = { chiave: k, sim };
    occorrenze += valide.length;
    for (const r of valide) {
      voti.push({
        valori: { centroCosto: r.centroCosto, categoria: r.categoria, type: r.type, direct: r.direct },
        peso: sim * pesoRecency(r, row.dataISO, options.halfLifeDays),
      });
    }
  }
  if (migliore === null || voti.length === 0) return null;

  const esito = vota(voti);
  const regoleApplicate = applicaRegole(esito.valori);
  return {
    valori: esito.valori,
    metodo: "fuzzy",
    chiave: migliore.chiave,
    similarita: migliore.sim,
    occorrenze,
    consenso: esito.consenso,
    consensoPerAsse: esito.consensoPerAsse,
    regoleApplicate,
  };
}

export interface TopMatch {
  chiave: string;
  similarita: number;
  occorrenze: number;
  /** Combinazione più votata tra le righe storiche di questa chiave (maggioranza semplice). */
  valori: Classificazione;
}

/**
 * Top N chiavi storiche più simili a una riga, come contesto per il fallback LLM
 * (task 3.4): a differenza di `matchRow`, non fonde i candidati in un'unica
 * decisione — mostra le alternative distinte così l'LLM può scegliere quella
 * pertinente (es. "Google Ads" vicino sia a "Google Ireland" che a "Google Cloud Italy").
 */
export function topFuzzyMatches(
  row: AcquistoRow,
  lookup: Lookup,
  n = 3,
  minSimilarity = 0.4,
): TopMatch[] {
  const key = lookupKey(row.fornitore, row.descrizione);
  if (key === "") return [];

  const candidati: TopMatch[] = [];
  for (const [k, righe] of lookup) {
    const sim = k === key ? 1 : similarity(key, k);
    if (sim < minSimilarity) continue;
    const voti: Voto[] = righe.map((r) => ({
      valori: { centroCosto: r.centroCosto, categoria: r.categoria, type: r.type, direct: r.direct },
      peso: 1,
    }));
    candidati.push({ chiave: k, similarita: sim, occorrenze: righe.length, valori: vota(voti).valori });
  }

  candidati.sort((a, b) => b.similarita - a.similarita || b.occorrenze - a.occorrenze);
  return candidati.slice(0, n);
}
