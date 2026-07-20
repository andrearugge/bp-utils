// Tipi condivisi tra i componenti della UI di revisione /classifica-acquisti.
// Le operazioni sul dominio (parsing, match, confidence, anomalie) restano in
// lib/classifica-acquisti/*; qui solo le forme specifiche di questa pagina.

import { AcquistoRow, Suggerimento } from "@/lib/classifica-acquisti/types";

export interface RigaConSuggerimento {
  row: AcquistoRow;
  /** null finché il suggerimento non è stato calcolato (es. in attesa della chiamata LLM). */
  suggerimento: Suggerimento | null;
}

export type ViewName = "da-classificare" | "anomalie" | "metriche";

export const VIEWS: { id: ViewName; label: string }[] = [
  { id: "da-classificare", label: "Da classificare" },
  { id: "anomalie", label: "Anomalie" },
  { id: "metriche", label: "Metriche" },
];
