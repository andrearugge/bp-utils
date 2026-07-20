// Gestione della tab di log (es. "Classifier Log"): creazione se assente,
// append di righe. Lo schema colonne concreto lo decide il chiamante (task 6.1);
// qui c'è solo il meccanismo generico "crea se manca" + "accoda".

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function handleError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new Error(body?.error?.message ?? `Errore API Google Sheets: ${res.status}`);
}

async function tabExists(token: string, sheetId: string, tabName: string): Promise<boolean> {
  const res = await fetch(`${BASE}/${sheetId}?fields=sheets.properties.title`, {
    headers: authHeader(token),
  });
  if (!res.ok) await handleError(res);
  const data = await res.json();
  const titles: string[] = (data.sheets ?? []).map((s: { properties: { title: string } }) => s.properties.title);
  return titles.includes(tabName);
}

async function createTab(token: string, sheetId: string, tabName: string, header: string[]): Promise<void> {
  const res = await fetch(`${BASE}/${sheetId}:batchUpdate`, {
    method: "POST",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: tabName } } }],
    }),
  });
  if (!res.ok) await handleError(res);

  const range = encodeURIComponent(`${tabName}!A1`);
  const headerRes = await fetch(`${BASE}/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ values: [header] }),
  });
  if (!headerRes.ok) await handleError(headerRes);
}

/** Crea la tab di log con l'header dato se non esiste già; non tocca nulla se è già presente. */
export async function ensureLogTab(
  token: string,
  sheetId: string,
  tabName: string,
  header: string[],
): Promise<void> {
  const exists = await tabExists(token, sheetId, tabName);
  if (!exists) await createTab(token, sheetId, tabName, header);
}

/** Accoda righe in fondo alla tab di log. Ritorna il numero di righe inserite. */
export async function appendLogRows(
  token: string,
  sheetId: string,
  tabName: string,
  rows: string[][],
): Promise<number> {
  if (rows.length === 0) return 0;

  const range = encodeURIComponent(`${tabName}!A1`);
  const res = await fetch(
    `${BASE}/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { ...authHeader(token), "Content-Type": "application/json" },
      body: JSON.stringify({ values: rows }),
    },
  );
  if (!res.ok) await handleError(res);

  const data = await res.json();
  return data.updates?.updatedRows ?? rows.length;
}
