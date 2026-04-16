"use client";

import { useState } from "react";
import { XlsUpload } from "@/components/pulizia-spese/XlsUpload";
import { ResultsTable } from "@/components/pulizia-spese/ResultsTable";
import { SpesaRow } from "@/lib/pulizia-spese/types";
import { downloadSpeseCsv } from "@/lib/pulizia-spese/csv";

export default function PuliziaSpeseePage() {
  const [rows, setRows] = useState<SpesaRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [editedFornitori, setEditedFornitori] = useState<Record<number, string>>({});
  const [editedDescrizioni, setEditedDescrizioni] = useState<Record<number, string>>({});

  function handleParsed(parsed: SpesaRow[], name: string) {
    setRows(parsed);
    setFileName(name);
    setEditedFornitori({});
    setEditedDescrizioni({});
  }

  function handleNewFile() {
    setRows(null);
    setFileName("");
    setEditedFornitori({});
    setEditedDescrizioni({});
  }

  function computeEffectiveRows(): SpesaRow[] {
    if (!rows) return [];
    return rows.map((row) => ({
      ...row,
      fornitore: editedFornitori[row.idx] ?? row.fornitore,
      descrizione: editedDescrizioni[row.idx] ?? row.descrizione,
    }));
  }

  function handleDownload() {
    downloadSpeseCsv(computeEffectiveRows(), fileName);
  }

  return (
    <main style={{ background: "#0a0a0b", minHeight: "100vh", color: "#e8e6e1" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 60px" }}>
        {rows === null ? (
          <XlsUpload onParsed={handleParsed} />
        ) : (
          <ResultsTable
            rows={rows}
            fileName={fileName}
            editedFornitori={editedFornitori}
            editedDescrizioni={editedDescrizioni}
            onFornitoreChange={(idx, val) => setEditedFornitori((p) => ({ ...p, [idx]: val }))}
            onDescrizioneChange={(idx, val) => setEditedDescrizioni((p) => ({ ...p, [idx]: val }))}
            onNewFile={handleNewFile}
            onDownload={handleDownload}
          />
        )}
      </div>
    </main>
  );
}
