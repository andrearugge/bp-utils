# Task di sviluppo — Classificatore Acquisti ACT

Legenda: `[ ]` da fare · `[~]` in corso · `[x]` completato · `[!]` errore/bloccato

Obiettivo: sistema di classificazione + error-detection per la tab "Acquisti - ACT"
del Business Plan, integrato nella web app, in sostituzione dello script Apps Script v4.0.

Dati di riferimento (export in `claude_archive/[Beconcept][2026] Business plan - Acquisti - ACT.csv`):
1.392 righe · 1.162 taggate (gen–mag 2026, ground truth) · 230 non taggate (giu + 1 riga di mag) ·
210 fornitori unici · 8 fornitori con combinazioni di tag multiple · 2 righe taggate con Direct vuoto.
Formati: date `dd/mm/yyyy`, importi `€ 1.234,56`, percentuali `0%`/`100%`, entità HTML nei nomi (`&amp;`).

Vincoli fissi:
- La colonna **Indirect** è ArrayFormula → mai scriverla.
- La colonna **Tag Source** esiste già sul foglio (valori: `manual` / `auto` / `confirmed`).
- Solo righe `manual`/`confirmed` alimentano il lookup storico.
- Nessuna scrittura sul foglio senza conferma umana esplicita.
- Prima di scrivere codice Next.js: leggere i docs in `node_modules/next/dist/docs/` (breaking changes).

---

## Fase 0 — Motore di classificazione, prototipo offline su CSV

- [x] **0.1** `lib/classifica-acquisti/types.ts` — tipi: `AcquistoRow`, tassonomia come const
      (centri costo, categorie, type, direct), `Suggerimento` (valori + score + evidenza + metodo),
      `Anomalia`, `TagSource`
- [ ] **0.2** `lib/classifica-acquisti/parse-csv.ts` — parser dell'export: date `dd/mm/yyyy`,
      importi `€ 1.234,56` → number, percentuali → 0|100, decode entità HTML, righe vuote/malformate
- [ ] **0.3** `lib/classifica-acquisti/normalize.ts` — normalizzazione fornitore: lowercase, trim,
      rimozione forme giuridiche (srl, spa, snc, sas, ltd, inc, sarl, gmbh…), punteggiatura,
      spazi multipli, entità HTML
- [ ] **0.4** `lib/classifica-acquisti/fuzzy.ts` — similarità fornitore: match esatto normalizzato →
      token-set overlap + edit distance (implementazione in-house, no dipendenze), score 0–1
- [ ] **0.5** `lib/classifica-acquisti/match.ts` — lookup storico: raggruppa ground truth per
      fornitore normalizzato, voto di maggioranza **pesato per recency** (decadimento esponenziale
      sulla data), regole deterministiche a valle (Leasing & Noleggi → Material;
      Cross BL → Direct 0; Direct+Indirect coerenti)
- [ ] **0.6** `lib/classifica-acquisti/confidence.ts` — confidence evidence-based: composizione di
      similarità match, n. occorrenze, consistenza storica delle etichette, accordo tra metodi.
      Soglie: `alta` (auto-proponibile) / `media` (rivedere) / `bassa` (→ fallback LLM)
- [ ] **0.7** `scripts/cross-validate.ts` — harness leave-one-out eseguibile offline (`npx tsx`):
      per ogni riga taggata, predici usando solo le altre; metriche di accuratezza per asse
      (Centro costo, Categoria, Type, Direct) + lista mismatch con motivazione
- [ ] **0.8** Taratura su dati reali: eseguire LOO sul CSV, tarare pesi/soglie, produrre report
      accuratezza — **checkpoint con l'utente prima di proseguire** (decide anche se il fuzzy
      basta o servono alias curati per casi tipo Google Ads/Google Ireland)

---

## Fase 1 — Estensione layer Google Sheets

- [ ] **1.1** `lib/google-sheets/auth.ts` — estrarre l'auth GIS da `lib/invia-bp/auth.ts` in modulo
      condiviso; `invia-bp` continua a funzionare (re-export o aggiornamento import)
- [ ] **1.2** `lib/google-sheets/read.ts` — `readTab`: lettura completa tab via `values.get`,
      mapping header→campi per nome colonna (non per posizione), inclusa colonna Tag Source
- [ ] **1.3** `lib/google-sheets/write.ts` — `batchUpdateCells`: scrittura mirata di celle singole
      via `values.batchUpdate` (mai riga intera, mai colonna Indirect)
- [ ] **1.4** `lib/google-sheets/log.ts` — gestione tab "Classifier Log": creazione se assente
      (`batchUpdate` + `addSheet`), append righe di log
- [ ] **1.5** Verifica manuale su un Google Sheet di test: read → write cella → log

---

## Fase 2 — Ground truth e backfill

- [ ] **2.1** `lib/classifica-acquisti/ground-truth.ts` — filtro righe ground truth:
      solo `Tag Source ∈ {manual, confirmed}`; righe `auto` e vuote escluse dal lookup
- [ ] **2.2** Backfill una-tantum della colonna Tag Source sul foglio: righe taggate fino a
      mag 2026 → `manual` (validate a mano, colori già puliti); proposta batch con conferma
      utente prima della scrittura
- [ ] **2.3** Gestire nel backfill le 2 righe con Direct vuoto e la riga di maggio non taggata
      (segnalarle all'utente, non inventare valori)

---

## Fase 3 — Fallback LLM con structured output

- [ ] **3.1** Leggere `node_modules/next/dist/docs/` per le convenzioni route handler di questa
      versione di Next.js
- [ ] **3.2** `app/api/classify/route.ts` — POST: batch di righe senza match affidabile →
      Claude con **tool use + JSON schema forzato** (un tool `classify_rows`, output validato),
      modello recente (Sonnet 5), **prompt caching** sul blocco statico
      (tassonomia + istruzioni + esempi)
- [ ] **3.3** Riusare/estrarre `fetchWithRetry` da `app/api/extract/route.ts` in util condivisa
- [ ] **3.4** Nel prompt: passare per ogni riga i top match fuzzy come contesto (l'LLM decide
      con lo storico sotto gli occhi, non alla cieca)
- [ ] **3.5** Test manuale con le righe di giugno realmente prive di storico

---

## Fase 4 — Error detection

- [ ] **4.1** `lib/classifica-acquisti/loo.ts` — leave-one-out come modulo runtime (riusa il core
      della Fase 0): mismatch su righe verificate → candidati "possibile errore" con motivazione
- [ ] **4.2** `lib/classifica-acquisti/stats.ts` — controlli statistici: importo fuori range
      tipico per fornitore (IQR), fornitore con tag incoerenti senza regola che lo giustifichi,
      combinazioni Categoria×Centro costo mai viste nel ground truth
- [ ] **4.3** Output unificato `Anomalia[]` (riga, tipo check, motivazione, severità)

---

## Fase 5 — UI di revisione `/classifica-acquisti`

- [ ] **5.1** `app/classifica-acquisti/page.tsx` — scaffold: auth Google + caricamento tab
      (riuso pattern step di `invia-bp`), stato in memoria
- [ ] **5.2** Vista "Da classificare": righe non taggate con suggerimento, confidence, metodo
      ed evidenza (match storico usato / regola / LLM); azioni accetta / modifica / scarta,
      selezione multipla per accettazione in blocco delle confidence alte
- [ ] **5.3** Scrittura conferme: celle dei 4 assi + `Tag Source = auto` (accettato senza
      modifica) o `confirmed` (rivisto/modificato) + riga nel Classifier Log — in un unico
      batch per riga
- [ ] **5.4** Vista "Anomalie": output Fase 4 su righe già taggate, con azioni
      correggi / ignora (ignora → loggato per non riproporre)
- [ ] **5.5** Vista "Metriche": accuratezza LOO per asse, copertura per metodo
      (esatto / fuzzy / LLM), n. righe per Tag Source
- [ ] **5.6** Card in home (`app/page.tsx`) per il nuovo strumento
- [ ] **5.7** `npm run build` + `tsc --noEmit` puliti

---

## Fase 6 — Audit trail e rifiniture

- [ ] **6.1** Schema tab "Classifier Log": timestamp, riga (data+fornitore+importo), valori
      proposti, metodo, score, evidenza sintetica, esito (accettato/modificato/scartato)
- [ ] **6.2** Test end-to-end sul foglio reale: classificare giugno 2026 con revisione completa
- [ ] **6.3** (opzionale) Aggiornare `app/api/extract/route.ts` allo stesso pattern
      structured output + modello recente
- [ ] **6.4** Dismissione script Apps Script v4.0 (disattivare trigger) una volta validato il flusso

---

## Note e blocchi

- I colori colonna A dello script vecchio NON sono un segnale affidabile: vengono puliti
  alla validazione manuale. Il ground truth si basa su Tag Source + cutoff (taggato ≤ mag 2026 = manuale).
