// Scrittura mirata di celle singole (mai riga intera): ogni update indirizza
// una colonna per nome (risolta in lettera A1 tramite gli header letti da
// readTab), mai per posizione fissa. La colonna "Indirect" è una ArrayFormula
// sul foglio e non va mai scritta: bloccata qui, non lasciata alla disciplina
// del chiamante.

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const COLONNA_PROTETTA = "Indirect";

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function handleError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new Error(body?.error?.message ?? `Errore API Google Sheets: ${res.status}`);
}

export interface CellUpdate {
  /** Numero riga sul foglio (header = 1, prima riga dati = 2). */
  rowIndex: number;
  /** Nome della colonna (header), non lettera/posizione. */
  column: string;
  value: string;
}

/** Indice colonna 0-based → lettera A1 (0 → "A", 25 → "Z", 26 → "AA", ...). */
export function columnLetter(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/**
 * Scrive un insieme di celle singole via `values.batchUpdate`. `headers` deve
 * provenire da una lettura recente della stessa tab (es. `readTab`), per
 * garantire che la colonna risolta corrisponda davvero a quella richiesta.
 * Lancia se un update punta a `Indirect` o a una colonna non presente in `headers`.
 */
export async function batchUpdateCells(
  token: string,
  sheetId: string,
  tabName: string,
  headers: string[],
  updates: CellUpdate[],
): Promise<number> {
  if (updates.length === 0) return 0;

  const data = updates.map((u) => {
    if (u.column === COLONNA_PROTETTA) {
      throw new Error(`La colonna "${COLONNA_PROTETTA}" è una ArrayFormula: non può essere scritta.`);
    }
    const colIndex = headers.indexOf(u.column);
    if (colIndex === -1) {
      throw new Error(`Colonna "${u.column}" non trovata nell'header della tab "${tabName}".`);
    }
    const range = `${tabName}!${columnLetter(colIndex)}${u.rowIndex}`;
    return { range, values: [[u.value]] };
  });

  const res = await fetch(`${BASE}/${sheetId}/values:batchUpdate`, {
    method: "POST",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ valueInputOption: "USER_ENTERED", data }),
  });
  if (!res.ok) await handleError(res);

  const body = await res.json();
  return body.totalUpdatedCells ?? updates.length;
}
