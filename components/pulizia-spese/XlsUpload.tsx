"use client";

import { useRef, useState } from "react";
import { parseXls } from "@/lib/pulizia-spese/parse-xls";
import { SpesaRow } from "@/lib/pulizia-spese/types";

interface XlsUploadProps {
  onParsed: (rows: SpesaRow[], fileName: string) => void;
}

export function XlsUpload({ onParsed }: XlsUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    if (!file.name.toLowerCase().match(/\.(xls|xlsx)$/)) {
      setError("Seleziona un file .xls o .xlsx");
      return;
    }
    setError(null);
    setIsParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseXls(buffer);
      if (result.error) {
        setError(result.error);
      } else {
        onParsed(result.rows, file.name);
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
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-5">
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#e8e6e1" }}>
          Pulizia spese FattureInCloud
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#6b6b70" }}>
          Carica l&apos;export XLS di FattureInCloud per convertirlo nel formato Business Plan.
        </p>
      </div>

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
            ? "Lettura in corso…"
            : <>Trascina qui oppure <span style={{ color: "#f59e0b", fontWeight: 600 }}>sfoglia</span></>
          }
        </p>
        <p style={{ margin: 0, color: "#6b6b70", fontSize: 13 }}>
          File .xls / .xlsx esportato da FattureInCloud
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xls,.xlsx"
        style={{ display: "none" }}
        onChange={handleChange}
      />

      {error && (
        <p style={{
          margin: 0,
          color: "#dc2626",
          fontSize: 13,
          background: "rgba(220,38,38,0.08)",
          border: "1px solid rgba(220,38,38,0.2)",
          borderRadius: 6,
          padding: "10px 14px",
        }}>
          {error}
        </p>
      )}
    </div>
  );
}
