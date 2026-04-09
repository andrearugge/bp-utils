# Task di sviluppo — Conversione Fatture

Legenda: `[ ]` da fare · `[~]` in corso · `[x]` completato · `[!]` errore/bloccato

---

## Fase 1 — Setup progetto

- [x] **1.1** Creare progetto Next.js 14+ con TypeScript, Tailwind, App Router, no src-dir
- [~] **1.2** Inizializzare shadcn/ui (style=Default, base color=Slate, CSS variables=Yes)
- [ ] **1.3** Installare componenti shadcn: `button table badge card tabs progress alert-dialog tooltip`
- [ ] **1.4** Verificare che `components.json` sia generato e `components/ui/` contenga i componenti installati
- [ ] **1.5** Creare `.env.local` con `ANTHROPIC_API_KEY` (placeholder — va sostituita con la chiave reale)

---

## Fase 2 — Librerie (`lib/`)

- [ ] **2.1** `lib/types.ts` — interfacce `InvoiceRecord` e tipo `AreaFilter`
- [ ] **2.2** `lib/storage.ts` — `loadRecords()` e `saveRecords()` con chiave `"fatture-db"`
- [ ] **2.3** `lib/prompt.ts` — esporta la stringa del prompt di estrazione (testo esatto da claude.md)
- [ ] **2.4** `lib/csv.ts` — generazione CSV con BOM UTF-8, separatore `;`, decimali `,`, filtro area, nome file dinamico
- [ ] **2.5** Verifica: i tipi TypeScript compilano senza errori (`tsc --noEmit`)

---

## Fase 3 — API Route

- [ ] **3.1** Creare `app/api/extract/route.ts` con metodo POST
- [ ] **3.2** Aggiungere `export const maxDuration = 60`
- [ ] **3.3** Implementare chiamata a `https://api.anthropic.com/v1/messages` con model `claude-sonnet-4-20250514`
- [ ] **3.4** Gestione errori: restituisce `{ error }` con status 400/500
- [ ] **3.5** Verifica: `tsc --noEmit` passa senza errori sulla route

---

## Fase 4 — Tema e layout

- [ ] **4.1** `app/globals.css` — sovrascrivere CSS variables shadcn con palette dark del progetto
- [ ] **4.2** `app/layout.tsx` — font DM Sans via `next/font/google`, `<html className="dark">`, metadata
- [ ] **4.3** Verifica visiva: `npm run dev` mostra sfondo `#0a0a0b` e font DM Sans

---

## Fase 5 — Componenti UI

- [ ] **5.1** `components/AreaBadge.tsx` — badge colorato con area e codice paese (EXTRA-UE / INTRA-UE / ITALIA)
- [ ] **5.2** `components/Header.tsx` — SVG animato con fatture fluttuanti, particelle ambrate, titolo "Conversione fatture"
- [ ] **5.3** `components/UploadTab.tsx` — dropzone drag&drop, file chips con rimozione, pulsante estrai, progress bar, pulsante interrompi
- [ ] **5.4** `components/ArchiveTab.tsx` — stats cards, filtri area, tabella con tutte le colonne, footer con svuota/aggiungi/scarica CSV
- [ ] **5.5** Verifica: `tsc --noEmit` passa su tutti i componenti

---

## Fase 6 — Pagina principale

- [ ] **6.1** `app/page.tsx` — `"use client"`, stato globale (records, activeTab, activeFilter, isProcessing, abortFlag)
- [ ] **6.2** Implementare logica batch: converti in base64 → POST /api/extract → crea record → salva in localStorage subito
- [ ] **6.3** Implementare pulsante "Interrompi" con flag abort
- [ ] **6.4** Logica tab iniziale: se archivio vuoto → tab Upload, altrimenti → tab Archivio
- [ ] **6.5** Verifica: `tsc --noEmit` sull'intera app

---

## Fase 7 — Test funzionale locale

- [ ] **7.1** `npm run dev` avvia senza errori
- [ ] **7.2** Upload di un PDF di test → estrazione funziona → record salvato in localStorage
- [ ] **7.3** Filtri area funzionano (tabella, stats, totale si aggiornano)
- [ ] **7.4** Download CSV: separatore `;`, decimali `,`, BOM UTF-8, filtro applicato
- [ ] **7.5** Svuota archivio: mostra conferma, elimina tutto, torna al tab Upload
- [ ] **7.6** Pulsante Interrompi: ferma il batch, i record già estratti rimangono

---

## Fase 8 — Deploy

- [ ] **8.1** `npm run build` passa senza errori
- [ ] **8.2** Configurare `ANTHROPIC_API_KEY` come environment variable su Vercel
- [ ] **8.3** `vercel` — deploy completato
- [ ] **8.4** Verifica produzione: upload file reale → estrazione funziona sul dominio Vercel

---

## Note e blocchi

_Nessuna nota al momento._
