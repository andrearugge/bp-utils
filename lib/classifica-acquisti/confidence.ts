// Confidence evidence-based per un MatchResult: composizione moltiplicativa di
// similarità del match, consenso storico e numerosità delle occorrenze.
// Le soglie separano ciò che è auto-proponibile da ciò che va rivisto o mandato
// al fallback LLM; i valori di default sono tarati con la LOO su dati reali (task 0.8).

import { AcquistoRow, LivelloConfidence, Suggerimento } from "./types";
import { MatchResult } from "./match";

export interface ConfidenceOptions {
  /** Score minimo per il livello "alta" (auto-proponibile). */
  sogliaAlta: number;
  /** Score minimo per il livello "media" (da rivedere); sotto → "bassa" (fallback LLM). */
  sogliaMedia: number;
  /** Occorrenze necessarie perché la numerosità non penalizzi (saturazione). */
  occorrenzePiene: number;
}

// Tarate con LOO sul CSV di riferimento (task 0.8): con sogliaAlta 0.85 il
// livello "alta" richiede di fatto ≥3 occorrenze storiche concordi e ha
// precisione 99.8%; la fascia 0.5–0.85 (1–2 occorrenze unanimi o storico
// conteso) si ferma a "media"; sotto 0.5 la precisione crolla → "bassa".
export const DEFAULT_CONFIDENCE_OPTIONS: ConfidenceOptions = {
  sogliaAlta: 0.85,
  sogliaMedia: 0.5,
  occorrenzePiene: 3,
};

/**
 * Score 0–1 dalla composizione delle evidenze:
 * - similarità del match fornitore (1 per esatto, <1 per fuzzy);
 * - consenso: quota di voto pesato della combinazione vincente
 *   (unanime = 1, storico conteso = basso);
 * - numerosità: 1 occorrenza è aneddotica, da `occorrenzePiene` in su non penalizza.
 * Le regole deterministiche applicate non abbassano lo score: sono correzioni certe.
 */
export function computeScore(
  match: MatchResult,
  options: ConfidenceOptions = DEFAULT_CONFIDENCE_OPTIONS,
): number {
  const numerosita = Math.min(match.occorrenze, options.occorrenzePiene) / options.occorrenzePiene;
  // La numerosità pesa meno delle altre evidenze: radice per attenuarne l'effetto.
  return match.similarita * match.consenso * Math.sqrt(numerosita);
}

export function livelloDaScore(
  score: number,
  options: ConfidenceOptions = DEFAULT_CONFIDENCE_OPTIONS,
): LivelloConfidence {
  if (score >= options.sogliaAlta) return "alta";
  if (score >= options.sogliaMedia) return "media";
  return "bassa";
}

function descriviEvidenza(match: MatchResult): string {
  const parti: string[] = [];
  if (match.metodo === "esatto") {
    parti.push(`match esatto su "${match.chiave}" (${match.occorrenze} righe storiche)`);
  } else {
    parti.push(
      `match fuzzy su "${match.chiave}" (similarità ${match.similarita.toFixed(2)}, ${match.occorrenze} righe storiche)`,
    );
  }
  parti.push(`consenso ${(match.consenso * 100).toFixed(0)}%`);
  if (match.regoleApplicate.length > 0) parti.push(`regole: ${match.regoleApplicate.join("; ")}`);
  return parti.join(", ");
}

/** Combina riga e match in un Suggerimento completo di score, livello ed evidenza. */
export function buildSuggerimento(
  row: AcquistoRow,
  match: MatchResult,
  options: ConfidenceOptions = DEFAULT_CONFIDENCE_OPTIONS,
): Suggerimento {
  const score = computeScore(match, options);
  return {
    rowIndex: row.rowIndex,
    valori: match.valori,
    score,
    livello: livelloDaScore(score, options),
    metodo: match.metodo,
    evidenza: descriviEvidenza(match),
    similarita: match.similarita,
    occorrenze: match.occorrenze,
  };
}
