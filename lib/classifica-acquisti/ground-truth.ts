// Filtro del ground truth per il lookup storico. Vale per righe lette dal
// foglio reale, dove la colonna Tag Source esiste. L'export CSV di riferimento
// non ha questa colonna (tagSource sempre null): scripts/cross-validate.ts
// continua perciò a usare isRowTaggata da solo, non questo filtro.

import { AcquistoRow, AcquistoRowTaggata, isRowTaggata, TagSource } from "./types";

const TAG_SOURCE_GROUND_TRUTH: ReadonlySet<TagSource> = new Set(["manual", "confirmed"]);

/**
 * Seleziona le righe utilizzabili come ground truth: taggate su tutti e 4 gli
 * assi E con Tag Source `manual` o `confirmed`. Righe `auto` (proposte accettate
 * senza revisione) e righe senza Tag Source sono escluse: il lookup deve
 * appoggiarsi solo su etichette verificate da una persona, altrimenti un errore
 * del classificatore si autoalimenterebbe nelle predizioni successive.
 */
export function selectGroundTruth(rows: AcquistoRow[]): AcquistoRowTaggata[] {
  return rows
    .filter(isRowTaggata)
    .filter((r) => r.tagSource !== null && TAG_SOURCE_GROUND_TRUTH.has(r.tagSource));
}
