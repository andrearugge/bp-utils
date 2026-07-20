// Output unificato dei check di error detection (Fase 4): un solo Anomalia[]
// per la UI di revisione, indipendentemente da quale controllo l'ha generata.
// Una riga può comparire più volte con tipi diversi (es. LOO mismatch e
// importo fuori range): sono segnalazioni distinte, non si deduplicano.

import { AcquistoRowTaggata, Anomalia, Severita } from "./types";
import { MatchOptions, DEFAULT_MATCH_OPTIONS } from "./match";
import { rileviLooMismatch } from "./loo";
import { rileviImportiFuoriRange, rileviTagIncoerenti, rileviCombinazioniInedite } from "./stats";

const ORDINE_SEVERITA: Record<Severita, number> = { alta: 0, media: 1, bassa: 2 };

/**
 * Esegue tutti i check di error detection sul ground truth e ritorna un unico
 * elenco di anomalie, ordinato per severità (alta → bassa) e poi per riga.
 */
export function rileviAnomalie(
  groundTruth: AcquistoRowTaggata[],
  matchOptions: MatchOptions = DEFAULT_MATCH_OPTIONS,
): Anomalia[] {
  const anomalie: Anomalia[] = [
    ...rileviLooMismatch(groundTruth, matchOptions),
    ...rileviImportiFuoriRange(groundTruth),
    ...rileviTagIncoerenti(groundTruth),
    ...rileviCombinazioniInedite(groundTruth),
  ];

  return anomalie.sort(
    (a, b) => ORDINE_SEVERITA[a.severita] - ORDINE_SEVERITA[b.severita] || a.rowIndex - b.rowIndex,
  );
}
