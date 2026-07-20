// Controlli statistici per l'error detection (Fase 4), indipendenti dal voto
// storico di match.ts: guardano la distribuzione degli importi per fornitore,
// la coerenza interna dei tag di uno stesso fornitore e la rarità delle
// combinazioni Categoria×Centro costo nel ground truth.

import { AcquistoRowTaggata, Classificazione, Anomalia, Severita } from "./types";
import { lookupKey } from "./normalize";

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const gruppi = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    if (k === "") continue;
    const list = gruppi.get(k);
    if (list) list.push(r);
    else gruppi.set(k, [r]);
  }
  return gruppi;
}

function quantile(sortedAsc: number[], q: number): number {
  const pos = (sortedAsc.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedAsc[base + 1] !== undefined) {
    return sortedAsc[base] + rest * (sortedAsc[base + 1] - sortedAsc[base]);
  }
  return sortedAsc[base];
}

/**
 * Importi fuori range tipico per fornitore, via IQR (1.5× oltre Q1/Q3, il
 * criterio standard per gli outlier). Richiede almeno `minOccorrenze` righe
 * storiche per il fornitore, altrimenti il range non è affidabile.
 */
export function rileviImportiFuoriRange(
  rows: AcquistoRowTaggata[],
  minOccorrenze = 5,
): Anomalia[] {
  const anomalie: Anomalia[] = [];
  const gruppi = groupBy(rows, (r) => lookupKey(r.fornitore, r.descrizione));

  for (const [chiave, righe] of gruppi) {
    if (righe.length < minOccorrenze) continue;
    const importi = righe.map((r) => r.imponibile).sort((a, b) => a - b);
    const q1 = quantile(importi, 0.25);
    const q3 = quantile(importi, 0.75);
    const iqr = q3 - q1;
    if (iqr === 0) continue;

    const lo = q1 - 1.5 * iqr;
    const hi = q3 + 1.5 * iqr;

    for (const r of righe) {
      if (r.imponibile >= lo && r.imponibile <= hi) continue;
      const distanzaOltreIqr = r.imponibile < lo ? (lo - r.imponibile) / iqr : (r.imponibile - hi) / iqr;
      const severita: Severita = distanzaOltreIqr > 1 ? "alta" : "media";
      anomalie.push({
        rowIndex: r.rowIndex,
        tipo: "importo-fuori-range",
        motivazione:
          `Importo € ${r.imponibile.toFixed(2)} fuori dal range tipico per "${chiave}" ` +
          `(atteso € ${lo.toFixed(2)}–${hi.toFixed(2)}, IQR su ${righe.length} righe storiche)`,
        severita,
      });
    }
  }

  return anomalie;
}

/**
 * Chiave di coerenza per il confronto tra righe dello stesso fornitore: gli
 * assi che una regola deterministica forza in base a un altro asse (Type se
 * Leasing & Noleggi, Direct se Cross BL) sono azzerati qui, perché la loro
 * variazione è attesa e non segnala un'incoerenza reale.
 */
function chiaveCoerenza(c: Classificazione): string {
  const type = c.categoria === "Leasing & Noleggi" ? "*" : c.type;
  const direct = c.centroCosto === "Cross BL" ? "*" : String(c.direct);
  return `${c.centroCosto}|${c.categoria}|${type}|${direct}`;
}

/**
 * Fornitori con combinazioni di tag incoerenti tra le loro righe storiche,
 * senza che nessuna regola nota la giustifichi. Segnala le righe che si
 * discostano dalla combinazione più frequente del fornitore.
 */
export function rileviTagIncoerenti(rows: AcquistoRowTaggata[]): Anomalia[] {
  const anomalie: Anomalia[] = [];
  const gruppi = groupBy(rows, (r) => lookupKey(r.fornitore, r.descrizione));

  for (const [chiave, righe] of gruppi) {
    if (righe.length < 2) continue;

    const conteggioPerCombo = new Map<string, number>();
    const esempioPerCombo = new Map<string, Classificazione>();
    for (const r of righe) {
      const combo = chiaveCoerenza(r);
      conteggioPerCombo.set(combo, (conteggioPerCombo.get(combo) ?? 0) + 1);
      if (!esempioPerCombo.has(combo)) {
        esempioPerCombo.set(combo, { centroCosto: r.centroCosto, categoria: r.categoria, type: r.type, direct: r.direct });
      }
    }
    if (conteggioPerCombo.size <= 1) continue;

    let comboMaggioritaria = "";
    let maxOccorrenze = 0;
    for (const [combo, n] of conteggioPerCombo) {
      if (n > maxOccorrenze) {
        maxOccorrenze = n;
        comboMaggioritaria = combo;
      }
    }
    // Valori concreti della combinazione maggioritaria: usati come proposta di
    // correzione (solo gli assi che differiscono dalla riga vengono mostrati).
    const valoriMaggioritari = esempioPerCombo.get(comboMaggioritaria)!;

    for (const r of righe) {
      if (chiaveCoerenza(r) === comboMaggioritaria) continue;
      anomalie.push({
        rowIndex: r.rowIndex,
        tipo: "tag-incoerenti",
        valoriAttesi: valoriMaggioritari,
        motivazione:
          `Fornitore "${chiave}": combinazione diversa dalla maggioranza delle sue ` +
          `${righe.length} righe storiche (${maxOccorrenze} concordi), nessuna regola nota la giustifica`,
        severita: maxOccorrenze >= 3 ? "alta" : "media",
      });
    }
  }

  return anomalie;
}

/**
 * Combinazioni Categoria×Centro costo presenti una sola volta nel ground
 * truth: nessun'altra riga le conferma, quindi vale la pena rivederle a mano.
 */
export function rileviCombinazioniInedite(rows: AcquistoRowTaggata[]): Anomalia[] {
  const conteggio = new Map<string, number>();
  for (const r of rows) {
    const k = `${r.categoria}|${r.centroCosto}`;
    conteggio.set(k, (conteggio.get(k) ?? 0) + 1);
  }

  const anomalie: Anomalia[] = [];
  for (const r of rows) {
    const k = `${r.categoria}|${r.centroCosto}`;
    if ((conteggio.get(k) ?? 0) > 1) continue;
    anomalie.push({
      rowIndex: r.rowIndex,
      tipo: "combinazione-inedita",
      motivazione: `Combinazione Categoria "${r.categoria}" × Centro costo "${r.centroCosto}" presente una sola volta nel ground truth`,
      severita: "bassa",
    });
  }

  return anomalie;
}
