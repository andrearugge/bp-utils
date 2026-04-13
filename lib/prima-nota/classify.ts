/** Regole di classificazione per la prima nota contabile */

type Azione = "Inserisci" | "Escludi" | "Verifica";

/**
 * Classifica una riga della prima nota in base al sottoconto e alla descrizione.
 * Le regole ESCLUDI vengono controllate prima delle INSERISCI.
 * La prima regola che matcha vince.
 */
export function classify(
  rawDesc: string,
  sottoconto: string
): { azione: Azione; motivo: string } {
  const raw = rawDesc.toLowerCase();
  const sub = sottoconto.toLowerCase();

  // ── ESCLUDI ──────────────────────────────────────────────────────────────
  // Movimenti finanziari / partite di giro — non sono costi di competenza
  if (sub.includes("iva conto erario"))
    return { azione: "Escludi", motivo: "Pagamento debito IVA → movimento di cassa" };
  if (sub.includes("debiti v/inps"))
    return { azione: "Escludi", motivo: "Pagamento debito INPS → già nel lordo stipendi" };
  if (sub.includes("erario c/irpef su retribuzioni"))
    return { azione: "Escludi", motivo: "Versamento ritenute IRPEF → già nel lordo stipendi" };
  if (sub.includes("erario c/ritenute passive"))
    return { azione: "Escludi", motivo: "Versamento ritenute d'acconto → movimento di cassa" };
  if (sub.includes("american express"))
    return { azione: "Escludi", motivo: "Saldo carta di credito → i costi sono nelle singole righe" };
  if (sub.includes("finanziamento cura"))
    return { azione: "Escludi", motivo: "Quota capitale mutuo → riduce debito, non è un costo" };
  if (sub.includes("dipendenti c/retribuzione"))
    return { azione: "Escludi", motivo: "Bonifico netto stipendio → costo già nella rilevazione" };
  if (sub.includes("amministratore c/compensi"))
    return { azione: "Escludi", motivo: "Bonifico netto compenso → costo già nella rilevazione" };
  if (sub.includes("carta di credito"))
    return { azione: "Escludi", motivo: "Saldo carta di credito → movimento di cassa" };
  if (sub.includes("cpb-ravvedimento"))
    return { azione: "Escludi", motivo: "Ravvedimento fiscale → non operativo" };
  if (sub.includes("ricavi prestazioni"))
    return { azione: "Escludi", motivo: "Questo è un RICAVO, non un costo" };
  // ESCLUDI — check su rawDesc
  if (raw.includes("deposito cauzionale"))
    return { azione: "Escludi", motivo: "Voce patrimoniale, non è un costo" };
  if (raw.includes("rilevazione ritenuta acconto"))
    return { azione: "Escludi", motivo: "Partita contabile ritenuta → non costo aggiuntivo" };

  // ── INSERISCI ─────────────────────────────────────────────────────────────
  // Costi di competenza da includere nel Business Plan
  if (sub.includes("compenso amministratore"))
    return { azione: "Inserisci", motivo: "Compenso lordo amministratore" };
  if (sub.includes("indennità di trasferta"))
    return { azione: "Inserisci", motivo: "Indennità trasferta amministratore" };
  if (sub.includes("contributi inps"))
    return { azione: "Inserisci", motivo: "Contributi previdenziali" };
  if (sub.includes("constributi inps"))
    return { azione: "Inserisci", motivo: "Contributi previdenziali (typo nel gestionale)" };
  if (sub.includes("salari e stipendi"))
    return { azione: "Inserisci", motivo: "Costo del personale" };
  if (sub.includes("stipendi apprendista"))
    return { azione: "Inserisci", motivo: "Costo del personale (apprendista)" };
  if (sub.includes("locazione ufficio"))
    return { azione: "Inserisci", motivo: "Affitto ufficio" };
  if (sub.includes("spese condominiali"))
    return { azione: "Inserisci", motivo: "Spese condominiali ufficio" };
  if (sub.includes("oneri bancari"))
    return { azione: "Inserisci", motivo: "Costi bancari" };
  if (sub.includes("interessi passivi su mutui"))
    return { azione: "Inserisci", motivo: "Interessi passivi (solo quota interessi)" };
  if (sub.includes("interessi passivi ravvedimento"))
    return { azione: "Inserisci", motivo: "Interessi passivi" };
  if (sub.includes("quote associative"))
    return { azione: "Inserisci", motivo: "Quote associative" };
  if (sub.includes("imposta di bollo"))
    return { azione: "Inserisci", motivo: "Imposta di bollo" };
  if (sub.includes("sanzioni, multe"))
    return { azione: "Inserisci", motivo: "Sanzioni e multe" };
  if (sub.includes("costi prestazioni software"))
    return { azione: "Inserisci", motivo: "Costi software/servizi web" };
  if (sub.includes("prestazioni professionali software"))
    return { azione: "Inserisci", motivo: "Costi professionali software" };
  if (sub.includes("spese telefoniche"))
    return { azione: "Inserisci", motivo: "Telefonia e internet" };
  if (sub.includes("acquisto di materiale"))
    return { azione: "Inserisci", motivo: "Materiale di consumo" };
  if (sub.includes("costi indeducibili"))
    return { azione: "Inserisci", motivo: "Costi senza fattura (indeducibili)" };
  if (sub.includes("debiti v/inail"))
    return { azione: "Inserisci", motivo: "Assicurazione INAIL" };
  // Combo: ricevuta occasionale + fornitori ordinari
  if (raw.includes("ricevuta occasionale") && sub.includes("fornitori ordinari"))
    return { azione: "Inserisci", motivo: "Prestazione occasionale" };

  // ── FALLBACK ──────────────────────────────────────────────────────────────
  return { azione: "Verifica", motivo: "Da verificare manualmente" };
}

// ─── Tabella servizi noti ─────────────────────────────────────────────────────

const KNOWN_SERVICES: Array<[RegExp, string]> = [
  [/iliad/i, "Iliad"],
  [/spotifyt?/i, "Spotify"],
  [/\bmeta\b/i, "Meta"],
  [/twilio/i, "Twilio"],
  [/chatbase/i, "Chatbase"],
  [/aruba/i, "Aruba"],
  [/amazon/i, "Amazon"],
  [/monotypefonts|monotype fonts/i, "Monotype Fonts"],
  [/speekly/i, "Speekly"],
  [/mailchimp/i, "Mailchimp"],
  [/porsche/i, "Porsche"],
  [/tamoil/i, "Tamoil"],
  [/xoldy/i, "Xoldy"],
  [/mega limited/i, "Mega Limited"],
  [/intergo telecom/i, "Intergo Telecom"],
  [/comune di milano/i, "Comune di Milano"],
  [/cherubini/i, "Cherubini"],
];

function matchKnownService(text: string): string | null {
  for (const [pattern, name] of KNOWN_SERVICES) {
    if (pattern.test(text)) return name;
  }
  return null;
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const MONTH_MAP: Record<string, string> = {
  GENNAIO: "Gennaio", FEBBRAIO: "Febbraio", MARZO: "Marzo",
  APRILE: "Aprile", MAGGIO: "Maggio", GIUGNO: "Giugno",
  LUGLIO: "Luglio", AGOSTO: "Agosto", SETTEMBRE: "Settembre",
  OTTOBRE: "Ottobre", NOVEMBRE: "Novembre", DICEMBRE: "Dicembre",
};

function extractMonth(rawDesc: string): string {
  const upper = rawDesc.toUpperCase();
  for (const [key, val] of Object.entries(MONTH_MAP)) {
    if (upper.includes(key)) return val;
  }
  return "";
}

/**
 * Deduce fornitore e descrizione pulita per una riga della prima nota.
 */
export function buildOutput(
  rawDesc: string,
  sottoconto: string
): { fornitore: string; descrizione: string } {
  const raw = rawDesc.toLowerCase();
  const sub = sottoconto.toLowerCase();

  // ── 1. Compensi amministratori ────────────────────────────────────────────
  if (sub.includes("compenso amministratore")) {
    const m = sottoconto.match(/compenso amministratore\s+(\S+)/i);
    const cognome = m ? m[1] : "";
    const mese = extractMonth(rawDesc);
    return {
      fornitore: cognome,
      descrizione: `Compenso amministratore${mese ? " - " + mese : ""}`,
    };
  }
  if (sub.includes("indennità di trasferta")) {
    const m = sottoconto.match(/indennità di trasferta\s+(\S+)/i);
    const cognome = m ? m[1] : "";
    const mese = extractMonth(rawDesc);
    return {
      fornitore: cognome,
      descrizione: `Indennità di trasferta${mese ? " - " + mese : ""}`,
    };
  }
  const hasContributiInps =
    sub.includes("contributi inps") || sub.includes("constributi inps");
  if (hasContributiInps) {
    // Try to extract a cognome (admin) vs generic (dipendenti)
    const m = sottoconto.match(/c[o]?ntributi inps\s+(\S+)/i);
    const afterKeyword = m ? m[1].toLowerCase() : "";
    const isAdmin =
      afterKeyword &&
      afterKeyword !== "dipendenti" &&
      afterKeyword !== "apprendista";
    const mese = extractMonth(rawDesc);
    if (isAdmin) {
      return {
        fornitore: m![1],
        descrizione: `Contributi INPS amministratore${mese ? " - " + mese : ""}`,
      };
    } else {
      return {
        fornitore: "",
        descrizione: `Contributi INPS dipendenti${mese ? " - " + mese : ""}`,
      };
    }
  }

  // ── 2. Stipendi dipendenti ────────────────────────────────────────────────
  if (sub.includes("salari e stipendi")) {
    const mese = extractMonth(rawDesc);
    return {
      fornitore: "",
      descrizione: `Stipendio dipendente${mese ? " - " + mese : ""}`,
    };
  }
  if (sub.includes("stipendi apprendista")) {
    const mese = extractMonth(rawDesc);
    return {
      fornitore: "",
      descrizione: `Stipendio apprendista${mese ? " - " + mese : ""}`,
    };
  }

  // ── 3. Ricevuta occasionale ───────────────────────────────────────────────
  if (raw.includes("ricevuta occasionale")) {
    // e.g. "RICEVUTA OCCASIONALE N.20260219100334753 RUSCONI DANIELE"
    const m = rawDesc.match(/ricevuta occasionale\s+(?:n\.\S+\s+)?(.+)/i);
    const nome = m ? toTitleCase(m[1].trim()) : "";
    return { fornitore: nome, descrizione: "Prestazione occasionale" };
  }

  // ── 7. Mutuo (before addebiti/servizi to catch mutuo keyword early) ───────
  if (raw.includes("mutuo") || sub.includes("finanziamento") || sub.includes("interessi passivi su mutui")) {
    if (sub.includes("interessi passivi su mutui") || sub.includes("interessi passivi ravvedimento")) {
      return { fornitore: "Intesa Sanpaolo", descrizione: "Interessi passivi su mutuo" };
    }
    return { fornitore: "Intesa Sanpaolo", descrizione: "Rata mutuo" };
  }

  // ── 4. Addebiti servizi senza fattura ─────────────────────────────────────
  const isSenzaFattura =
    raw.startsWith("add.") || raw.includes("no fatt") || raw.includes("manca fatt");
  if (isSenzaFattura) {
    const service = matchKnownService(rawDesc) ?? toTitleCase(rawDesc.replace(/^add\.\s*/i, "").split(/\s+/)[0]);
    return {
      fornitore: service,
      descrizione: `Abbonamento ${service} (senza fattura)`,
    };
  }

  // ── 5. Servizi noti ───────────────────────────────────────────────────────
  const knownService = matchKnownService(rawDesc);
  if (knownService) {
    const desc = sub.includes("spese telefoniche")
      ? `Telefonia ${knownService}`
      : `Abbonamento ${knownService}`;
    return { fornitore: knownService, descrizione: desc };
  }

  // ── 6. Bonifici (Nome {xxx} Mandato) ─────────────────────────────────────
  const bonificoMatch = rawDesc.match(/Nome\s+(.+?)\s+(?:Mandato|Codice)/i);
  if (bonificoMatch) {
    const fornitore = toTitleCase(bonificoMatch[1].trim());
    const descrizione = toTitleCase(sottoconto);
    return { fornitore, descrizione };
  }

  // ── 8. Locazione / condominiali ───────────────────────────────────────────
  if (sub.includes("locazione ufficio")) {
    const mese = extractMonth(rawDesc);
    return {
      fornitore: "",
      descrizione: `Affitto ufficio - Via Turbini${mese ? " - " + mese : ""}`,
    };
  }
  if (sub.includes("spese condominiali")) {
    return { fornitore: "", descrizione: "Spese condominiali ufficio" };
  }

  // ── 9. Oneri bancari ─────────────────────────────────────────────────────
  if (sub.includes("oneri bancari")) {
    const mese = extractMonth(rawDesc);
    if (raw.includes("canone mensile")) {
      return {
        fornitore: "Intesa Sanpaolo",
        descrizione: `Canone conto corrente${mese ? " - " + mese : ""}`,
      };
    }
    return { fornitore: "Intesa Sanpaolo", descrizione: "Oneri bancari" };
  }

  // ── 10. F24 ───────────────────────────────────────────────────────────────
  if (raw.includes("delega f24")) {
    return { fornitore: "Erario", descrizione: toTitleCase(sottoconto) };
  }

  // ── 11. Pagamenti con carta ───────────────────────────────────────────────
  if (raw.includes("mediante la carta")) {
    const m = rawDesc.match(/[Pp]resso\s+(.+?)(?:\s*$|\s+[A-Z]{2,}\s)/);
    const fornitore = m ? toTitleCase(m[1].trim()) : "";
    return { fornitore, descrizione: toTitleCase(sottoconto) };
  }

  // ── 12. Fallback ─────────────────────────────────────────────────────────
  return {
    fornitore: "",
    descrizione: toTitleCase(sottoconto),
  };
}
