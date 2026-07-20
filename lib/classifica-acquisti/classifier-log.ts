// Schema condiviso della tab "Classifier Log" (task 6.1): un'unica definizione
// usata da entrambe le viste che scrivono nel log (Da classificare, Anomalie),
// per evitare che ognuna inventi un proprio formato.
//
// La colonna Riga usa data+fornitore+importo, non il numero di riga sul
// foglio: i numeri di riga si spostano se qualcuno inserisce o cancella righe,
// mentre data+fornitore+importo restano un riferimento stabile nel tempo.

import { Classificazione } from "./types";

export const CLASSIFIER_LOG_TAB_NAME = "Classifier Log";

export const CLASSIFIER_LOG_HEADER = [
  "Timestamp", "Riga", "Valori proposti", "Metodo", "Score", "Evidenza", "Esito",
];

/** Esito unico per tutte le azioni di revisione, sia in "Da classificare" che in "Anomalie". */
export type EsitoLog = "accettato" | "modificato" | "scartato";

export interface VoceLog {
  data: string;
  fornitore: string;
  descrizione: string;
  imponibile: number;
  /** Assente per "scartato": non c'è nessun valore scritto sul foglio da registrare. */
  valori?: Classificazione;
  metodo: string;
  score: number;
  evidenza: string;
  esito: EsitoLog;
}

/** Riferimento leggibile e stabile alla riga: data · fornitore (o descrizione) · importo. */
export function riferimentoRiga(v: Pick<VoceLog, "data" | "fornitore" | "descrizione" | "imponibile">): string {
  const identificativo = v.fornitore || v.descrizione;
  return `${v.data} · ${identificativo} · € ${v.imponibile.toFixed(2)}`;
}

export function costruisciRigaLog(v: VoceLog, timestamp: string): string[] {
  return [
    timestamp,
    riferimentoRiga(v),
    v.valori ? JSON.stringify(v.valori) : "",
    v.metodo,
    v.score.toFixed(2),
    v.evidenza,
    v.esito,
  ];
}
