"use client";

import React, { useRef, useState } from "react";
import { parsePrimaNotaCsv } from "@/lib/prima-nota/parse-csv";
import { PrimaNotaRow } from "@/lib/prima-nota/types";

const SAMPLE_CSV =
  "Data registrazione;Descrizione dell'operazione;Descrizione sottoconto;Importo dare;Causale contabile\r\n" +
  "01/01/2024;Fattura Aruba SPA - hosting gen 2024;Spese informatiche;120,00;Acquisto beni/servizi\r\n" +
  "15/01/2024;Retribuzione gennaio 2024 Rossi Mario;Stipendi e salari;2500,00;Pagamento stipendio\r\n" +
  "20/01/2024;Amazon Web Services gen 2024;Spese informatiche;89,00;Acquisto beni/servizi\r\n" +
  "05/02/2024;F24 versamento IVA gen 2024;Erario c/IVA;1850,00;Versamento IVA\r\n" +
  "10/02/2024;Affitto ufficio febbraio 2024;Fitti passivi;900,00;Pagamento canone\r\n";

const REQUIRED_COLUMNS: [string, string][] = [
  ["Data registrazione", "Data dell'operazione contabile"],
  ["Descrizione dell'operazione", "Testo libero dell'operazione (usato per estrarre fornitore e descrizione)"],
  ["Descrizione sottoconto", "Sottoconto del piano dei conti (usato per la classificazione)"],
  ["Importo dare", "Importo dell'uscita"],
  ["Causale contabile", "Causale dell'operazione"],
];

function downloadSampleCsv() {
  const bom = "﻿";
  const blob = new Blob([bom + SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "prima-nota-esempio.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface CsvUploadProps {
  onClassified: (rows: PrimaNotaRow[], fileName: string) => void;
}

export function CsvUpload({ onClassified }: CsvUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Seleziona un file .csv");
      return;
    }
    setError(null);
    setIsParsing(true);
    try {
      const text = await file.text();
      const result = parsePrimaNotaCsv(text);
      if (result.error) {
        setError(result.error);
      } else {
        onClassified(result.rows, file.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante la lettura del file.");
    } finally {
      setIsParsing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        onClick={() => !isParsing && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragOver ? "#f59e0b" : error ? "#dc2626" : "#2a2a30"}`,
          borderRadius: 8,
          padding: "56px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          cursor: isParsing ? "wait" : "pointer",
          background: isDragOver ? "rgba(245,158,11,0.04)" : "transparent",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <span style={{ fontSize: 48, opacity: 0.3, lineHeight: 1, color: "#e8e6e1" }}>
          {isParsing ? "⟳" : "↑"}
        </span>
        <p style={{ margin: 0, color: "#e8e6e1", fontSize: 15 }}>
          {isParsing
            ? "Classificazione in corso…"
            : <>
                Trascina qui oppure{" "}
                <span style={{ color: "#f59e0b", fontWeight: 600 }}>sfoglia</span>
              </>
          }
        </p>
        <p style={{ margin: 0, color: "#6b6b70", fontSize: 13 }}>
          Solo file .csv — un file alla volta
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={handleChange}
      />

      {error && (
        <p
          style={{
            margin: 0,
            color: "#dc2626",
            fontSize: 13,
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.2)",
            borderRadius: 6,
            padding: "10px 14px",
          }}
        >
          {error}
        </p>
      )}

      {/* Format info */}
      <div
        style={{
          borderRadius: 8,
          border: "1px solid #1e1e24",
          padding: "14px 18px",
          background: "rgba(255,255,255,0.015)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
            gap: 12,
          }}
        >
          <p style={{ margin: 0, color: "#e8e6e1", fontSize: 13, fontWeight: 600 }}>
            Formato richiesto
          </p>
          <button
            onClick={downloadSampleCsv}
            style={{
              background: "transparent",
              border: "1px solid #2a2a30",
              borderRadius: 6,
              color: "#f59e0b",
              fontSize: 12,
              padding: "5px 12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 500,
            }}
          >
            ↓ Scarica file di esempio
          </button>
        </div>
        <p style={{ margin: "0 0 10px", color: "#6b6b70", fontSize: 12 }}>
          File <code style={{ color: "#9ca3af" }}>.csv</code> con separatore{" "}
          <code style={{ color: "#9ca3af" }}>;</code> o{" "}
          <code style={{ color: "#9ca3af" }}>,</code>. Colonne obbligatorie:
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            columnGap: 16,
            rowGap: 5,
          }}
        >
          {REQUIRED_COLUMNS.map(([col, desc]) => (
            <React.Fragment key={col}>
              <code style={{ color: "#f59e0b", fontSize: 11, whiteSpace: "nowrap", alignSelf: "start" }}>
                {col}
              </code>
              <span style={{ color: "#6b6b70", fontSize: 12, alignSelf: "start" }}>
                {desc}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
