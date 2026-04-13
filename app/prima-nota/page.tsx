"use client";

import { useState } from "react";
import { CsvUpload } from "@/components/prima-nota/CsvUpload";
import { ResultsTable } from "@/components/prima-nota/ResultsTable";
import { PrimaNotaRow, AzioneFilter } from "@/lib/prima-nota/types";
import { downloadPrimaNotaCsv } from "@/lib/prima-nota/csv";

export default function PrimaNotaPage() {
  const [rows, setRows] = useState<PrimaNotaRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [filter, setFilter] = useState<AzioneFilter>("Tutti");
  const [editedAzioni, setEditedAzioni] = useState<Record<number, "Inserisci" | "Escludi" | "Verifica">>({});
  const [editedFornitori, setEditedFornitori] = useState<Record<number, string>>({});
  const [editedDescrizioni, setEditedDescrizioni] = useState<Record<number, string>>({});

  function handleClassified(classified: PrimaNotaRow[], name: string) {
    setRows(classified);
    setFileName(name);
    setFilter("Tutti");
    setEditedAzioni({});
    setEditedFornitori({});
    setEditedDescrizioni({});
  }

  function handleNewFile() {
    setRows(null);
    setFileName("");
    setFilter("Tutti");
    setEditedAzioni({});
    setEditedFornitori({});
    setEditedDescrizioni({});
  }

  function computeEffectiveRows(): PrimaNotaRow[] {
    if (!rows) return [];
    return rows.map((row) => ({
      ...row,
      azione: editedAzioni[row.idx] ?? row.azione,
      fornitore: editedFornitori[row.idx] ?? row.fornitore,
      descrizione: editedDescrizioni[row.idx] ?? row.descrizione,
    }));
  }

  function handleDownload(soloInserisci: boolean) {
    downloadPrimaNotaCsv(computeEffectiveRows(), soloInserisci, fileName);
  }

  function handleAzioneChange(idx: number, azione: "Inserisci" | "Escludi" | "Verifica") {
    setEditedAzioni((prev) => ({ ...prev, [idx]: azione }));
  }

  function handleFornitoreChange(idx: number, value: string) {
    setEditedFornitori((prev) => ({ ...prev, [idx]: value }));
  }

  function handleDescrizioneChange(idx: number, value: string) {
    setEditedDescrizioni((prev) => ({ ...prev, [idx]: value }));
  }

  return (
    <main style={{ background: "#0a0a0b", minHeight: "100vh", color: "#e8e6e1" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 60px" }}>
        {rows === null ? (
          <CsvUpload onClassified={handleClassified} />
        ) : (
          <ResultsTable
            rows={rows}
            fileName={fileName}
            filter={filter}
            editedAzioni={editedAzioni}
            editedFornitori={editedFornitori}
            editedDescrizioni={editedDescrizioni}
            onFilterChange={setFilter}
            onAzioneChange={handleAzioneChange}
            onFornitoreChange={handleFornitoreChange}
            onDescrizioneChange={handleDescrizioneChange}
            onNewFile={handleNewFile}
            onDownload={handleDownload}
          />
        )}
      </div>
    </main>
  );
}
