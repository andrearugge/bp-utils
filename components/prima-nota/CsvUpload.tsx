"use client";

import { useRef, useState } from "react";
import { parsePrimaNotaCsv } from "@/lib/prima-nota/parse-csv";
import { PrimaNotaRow } from "@/lib/prima-nota/types";

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
    </div>
  );
}
