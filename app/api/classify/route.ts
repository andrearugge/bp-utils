import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/anthropic/fetch-with-retry";
import {
  CENTRI_COSTO,
  CATEGORIE,
  TYPES,
  DIRECT_VALUES,
  Classificazione,
} from "@/lib/classifica-acquisti/types";
import { TopMatch } from "@/lib/classifica-acquisti/match";

export const maxDuration = 60;

const MODEL = "claude-sonnet-5";
const MAX_ROWS_PER_BATCH = 100;

interface RigaDaClassificare {
  rowIndex: number;
  data: string;
  fornitore: string;
  descrizione: string;
  imponibile: number;
  /** Top candidati storici fuzzy, come contesto: l'LLM decide con lo storico sotto gli occhi. */
  topMatches: TopMatch[];
}

interface ClassifyRequestBody {
  rows: RigaDaClassificare[];
}

/** Forma piatta restituita dal tool classify_rows. */
interface ClassificazioneToolOutput {
  rowIndex: number;
  centroCosto: Classificazione["centroCosto"];
  categoria: Classificazione["categoria"];
  type: Classificazione["type"];
  direct: Classificazione["direct"];
  motivazione: string;
}

interface ClassificazioneLlm {
  rowIndex: number;
  valori: Classificazione;
  motivazione: string;
}

const SYSTEM_PROMPT = `Sei un classificatore per la tab "Acquisti - ACT" del Business Plan di Beconcept.
Per ogni riga assegna un valore per ciascuno dei 4 assi, scegliendo solo tra i valori elencati:

- Centro costo: ${CENTRI_COSTO.join(", ")}
- Categoria: ${CATEGORIE.join(", ")}
- Type: ${TYPES.join(", ")}
- Direct: ${DIRECT_VALUES.join(" oppure ")} (percentuale diretta sul centro di costo)

Regole fisse del Business Plan, da rispettare sempre:
- Se Categoria = "Leasing & Noleggi" allora Type deve essere "Material".
- Se Centro costo = "Cross BL" allora Direct deve essere 0.

Per ogni riga trovi "topMatches": i fornitori storici più simili con le rispettive classificazioni
già confermate a mano, con similarità (1 = fornitore pressoché identico) e numero di occorrenze
storiche. Usa questa evidenza come base primaria: se un match ha similarità alta e più occorrenze
concordi, seguilo. Se i topMatches sono deboli, assenti o discordanti, usa la tua conoscenza
generale del fornitore/servizio dalla descrizione e dal nome, restando comunque nella tassonomia sopra.

Rispondi chiamando lo strumento classify_rows con una voce per ogni riga ricevuta, nello stesso
ordine. Nel campo motivazione scrivi una frase breve in italiano che citi l'evidenza usata
(es. "match storico su 'google ads' (sim. 0.95, 4 occorrenze)" oppure "nessuno storico utile,
dedotto da nome e descrizione: piattaforma pubblicitaria estera").`;

const CLASSIFY_TOOL = {
  name: "classify_rows",
  description:
    "Classifica un batch di righe Acquisti - ACT sui 4 assi (Centro costo, Categoria, Type, Direct).",
  input_schema: {
    type: "object",
    properties: {
      classificazioni: {
        type: "array",
        items: {
          type: "object",
          properties: {
            rowIndex: { type: "integer" },
            centroCosto: { type: "string", enum: [...CENTRI_COSTO] },
            categoria: { type: "string", enum: [...CATEGORIE] },
            type: { type: "string", enum: [...TYPES] },
            direct: { type: "integer", enum: [...DIRECT_VALUES] },
            motivazione: { type: "string" },
          },
          required: ["rowIndex", "centroCosto", "categoria", "type", "direct", "motivazione"],
          additionalProperties: false,
        },
      },
    },
    required: ["classificazioni"],
    additionalProperties: false,
  },
  strict: true,
};

function buildUserContent(rows: RigaDaClassificare[]): string {
  const righe = rows.map((r) => ({
    rowIndex: r.rowIndex,
    data: r.data,
    fornitore: r.fornitore,
    descrizione: r.descrizione,
    imponibile: r.imponibile,
    topMatches: r.topMatches.map((m) => ({
      chiave: m.chiave,
      similarita: Number(m.similarita.toFixed(2)),
      occorrenze: m.occorrenze,
      valori: m.valori,
    })),
  }));
  return JSON.stringify({ righe });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key non configurata" }, { status: 500 });
  }

  let body: ClassifyRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body non valido" }, { status: 400 });
  }

  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Campo rows obbligatorio e non vuoto" }, { status: 400 });
  }
  if (rows.length > MAX_ROWS_PER_BATCH) {
    return NextResponse.json(
      { error: `Troppe righe in un batch (${rows.length}): massimo ${MAX_ROWS_PER_BATCH}` },
      { status: 400 },
    );
  }

  const anthropicBody = JSON.stringify({
    model: MODEL,
    max_tokens: Math.min(1024 + rows.length * 200, 8000),
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: [CLASSIFY_TOOL],
    tool_choice: { type: "tool", name: "classify_rows" },
    messages: [{ role: "user", content: buildUserContent(rows) }],
  });

  const anthropicHeaders = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
  };

  let anthropicResponse: Response;
  try {
    anthropicResponse = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: anthropicHeaders,
      body: anthropicBody,
    });
  } catch (err) {
    return NextResponse.json({ error: `Errore di rete: ${String(err)}` }, { status: 500 });
  }

  if (!anthropicResponse.ok) {
    const errorText = await anthropicResponse.text();
    return NextResponse.json(
      { error: `Anthropic API error ${anthropicResponse.status}: ${errorText}` },
      { status: anthropicResponse.status >= 500 ? 502 : 400 },
    );
  }

  const result = await anthropicResponse.json();

  if (result.stop_reason === "refusal") {
    return NextResponse.json({ error: "Richiesta rifiutata dal modello" }, { status: 502 });
  }

  const toolUse = (result.content ?? []).find(
    (block: { type: string }) => block.type === "tool_use",
  );
  if (!toolUse) {
    return NextResponse.json({ error: "Nessuna tool_use nella risposta del modello" }, { status: 502 });
  }

  const classificazioni = toolUse.input?.classificazioni as ClassificazioneToolOutput[] | undefined;
  if (!Array.isArray(classificazioni)) {
    return NextResponse.json({ error: "Formato risposta inatteso dello strumento" }, { status: 502 });
  }

  const risultati: ClassificazioneLlm[] = classificazioni.map((c) => ({
    rowIndex: c.rowIndex,
    valori: { centroCosto: c.centroCosto, categoria: c.categoria, type: c.type, direct: c.direct },
    motivazione: c.motivazione,
  }));

  return NextResponse.json({ risultati });
}
