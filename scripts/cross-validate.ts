// Cross-validation leave-one-out del classificatore Acquisti - ACT, offline su CSV.
//
//   npx tsx scripts/cross-validate.ts [--csv <path>] [--half-life 90] [--min-fuzzy 0.85]
//                                     [--soglia-alta 0.75] [--soglia-media 0.5]
//                                     [--mismatch] [--json <path>]
//
// Per ogni riga taggata predice i 4 assi usando solo le altre righe e riporta
// accuratezza per asse, copertura per metodo e distribuzione per livello di
// confidence. Con --mismatch stampa il dettaglio degli errori.

import { readFileSync, writeFileSync } from "node:fs";
import { parseAcquistiCsv } from "../lib/classifica-acquisti/parse-csv";
import { ASSI, Asse, isRowTaggata, LivelloConfidence } from "../lib/classifica-acquisti/types";
import { buildLookup, matchRow, DEFAULT_MATCH_OPTIONS, MatchOptions } from "../lib/classifica-acquisti/match";
import {
  buildSuggerimento,
  DEFAULT_CONFIDENCE_OPTIONS,
  ConfidenceOptions,
} from "../lib/classifica-acquisti/confidence";

const DEFAULT_CSV =
  "claude_archive/[Beconcept][2026] Business plan - Acquisti - ACT.csv";

function parseArgs(argv: string[]) {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const num = (flag: string, fallback: number): number => {
    const v = get(flag);
    return v === undefined ? fallback : Number(v);
  };
  return {
    csv: get("--csv") ?? DEFAULT_CSV,
    matchOptions: {
      halfLifeDays: num("--half-life", DEFAULT_MATCH_OPTIONS.halfLifeDays),
      minFuzzySimilarity: num("--min-fuzzy", DEFAULT_MATCH_OPTIONS.minFuzzySimilarity),
    } satisfies MatchOptions,
    confidenceOptions: {
      sogliaAlta: num("--soglia-alta", DEFAULT_CONFIDENCE_OPTIONS.sogliaAlta),
      sogliaMedia: num("--soglia-media", DEFAULT_CONFIDENCE_OPTIONS.sogliaMedia),
      occorrenzePiene: num("--occorrenze-piene", DEFAULT_CONFIDENCE_OPTIONS.occorrenzePiene),
    } satisfies ConfidenceOptions,
    mostraMismatch: argv.includes("--mismatch"),
    jsonPath: get("--json"),
  };
}

interface Mismatch {
  rowIndex: number;
  fornitore: string;
  descrizione: string;
  data: string;
  livello: LivelloConfidence;
  score: number;
  metodo: string;
  evidenza: string;
  errori: { asse: Asse; atteso: string; predetto: string }[];
}

const ETICHETTE_ASSE: Record<Asse, string> = {
  centroCosto: "Centro costo",
  categoria: "Categoria",
  type: "Type",
  direct: "Direct",
};

function main() {
  const args = parseArgs(process.argv.slice(2));
  const csv = readFileSync(args.csv, "utf8");
  const { rows, avvisi } = parseAcquistiCsv(csv);
  if (avvisi.length > 0) {
    console.log(`avvisi parser: ${avvisi.length}`);
    for (const a of avvisi) console.log(`  riga ${a.rowIndex}: ${a.motivo}`);
  }

  const gt = rows.filter(isRowTaggata);
  console.log(`righe totali: ${rows.length} · ground truth: ${gt.length}`);
  console.log(
    `parametri: half-life ${args.matchOptions.halfLifeDays}g · min-fuzzy ${args.matchOptions.minFuzzySimilarity} · soglie ${args.confidenceOptions.sogliaAlta}/${args.confidenceOptions.sogliaMedia}\n`,
  );

  const lookup = buildLookup(gt);

  const perAsse: Record<Asse, { corretti: number; totale: number }> = {
    centroCosto: { corretti: 0, totale: 0 },
    categoria: { corretti: 0, totale: 0 },
    type: { corretti: 0, totale: 0 },
    direct: { corretti: 0, totale: 0 },
  };
  const perLivello: Record<LivelloConfidence, { righe: number; righeGiuste: number }> = {
    alta: { righe: 0, righeGiuste: 0 },
    media: { righe: 0, righeGiuste: 0 },
    bassa: { righe: 0, righeGiuste: 0 },
  };
  const perMetodo = new Map<string, number>();
  const mismatches: Mismatch[] = [];
  let senzaMatch = 0;

  for (const row of gt) {
    const match = matchRow(row, lookup, { ...args.matchOptions, escludiRowIndex: row.rowIndex });
    if (match === null) {
      senzaMatch++;
      continue;
    }
    const sugg = buildSuggerimento(row, match, args.confidenceOptions);
    perMetodo.set(sugg.metodo, (perMetodo.get(sugg.metodo) ?? 0) + 1);

    const errori: Mismatch["errori"] = [];
    for (const asse of ASSI) {
      perAsse[asse].totale++;
      if (match.valori[asse] === row[asse]) perAsse[asse].corretti++;
      else errori.push({ asse, atteso: String(row[asse]), predetto: String(match.valori[asse]) });
    }
    perLivello[sugg.livello].righe++;
    if (errori.length === 0) perLivello[sugg.livello].righeGiuste++;
    else {
      mismatches.push({
        rowIndex: row.rowIndex,
        fornitore: row.fornitore,
        descrizione: row.descrizione,
        data: row.data,
        livello: sugg.livello,
        score: sugg.score,
        metodo: sugg.metodo,
        evidenza: sugg.evidenza,
        errori,
      });
    }
  }

  const conMatch = gt.length - senzaMatch;
  console.log(`copertura: ${conMatch}/${gt.length} righe con match storico (${senzaMatch} senza → LLM)`);
  for (const [metodo, n] of perMetodo) console.log(`  metodo ${metodo}: ${n}`);

  console.log("\naccuratezza per asse (sulle righe con match):");
  for (const asse of ASSI) {
    const { corretti, totale } = perAsse[asse];
    const pct = totale > 0 ? ((corretti / totale) * 100).toFixed(1) : "n/a";
    console.log(`  ${ETICHETTE_ASSE[asse].padEnd(12)} ${pct}%  (${corretti}/${totale})`);
  }

  const tuttiGiusti = conMatch - mismatches.length;
  console.log(
    `\nrighe con tutti e 4 gli assi corretti: ${tuttiGiusti}/${conMatch} (${((tuttiGiusti / conMatch) * 100).toFixed(1)}%)`,
  );

  console.log("\nper livello di confidence (righe intere corrette):");
  for (const livello of ["alta", "media", "bassa"] as const) {
    const { righe, righeGiuste } = perLivello[livello];
    const pct = righe > 0 ? ((righeGiuste / righe) * 100).toFixed(1) : "n/a";
    console.log(`  ${livello.padEnd(6)} ${String(righe).padStart(4)} righe · precisione ${pct}%`);
  }

  console.log(`\nmismatch: ${mismatches.length}`);
  if (args.mostraMismatch) {
    for (const m of mismatches) {
      const chi = m.fornitore !== "" ? m.fornitore : `[desc] ${m.descrizione.slice(0, 60)}`;
      console.log(`\n  riga ${m.rowIndex} · ${m.data} · ${chi}`);
      console.log(`    ${m.metodo} · score ${m.score.toFixed(2)} (${m.livello}) · ${m.evidenza}`);
      for (const e of m.errori) {
        console.log(`    ${ETICHETTE_ASSE[e.asse]}: atteso "${e.atteso}", predetto "${e.predetto}"`);
      }
    }
  }

  if (args.jsonPath) {
    writeFileSync(
      args.jsonPath,
      JSON.stringify({ parametri: args, perAsse, perLivello, senzaMatch, mismatches }, null, 2),
    );
    console.log(`\nreport JSON scritto in ${args.jsonPath}`);
  }
}

main();
