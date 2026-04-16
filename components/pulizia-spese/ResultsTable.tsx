"use client";

import { SpesaRow } from "@/lib/pulizia-spese/types";

interface ResultsTableProps {
  rows: SpesaRow[];
  fileName: string;
  editedFornitori: Record<number, string>;
  editedDescrizioni: Record<number, string>;
  onFornitoreChange: (idx: number, value: string) => void;
  onDescrizioneChange: (idx: number, value: string) => void;
  onNewFile: () => void;
  onDownload: () => void;
}

const CELL: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 13,
  color: "#e8e6e1",
  borderBottom: "1px solid #1a1a1e",
  verticalAlign: "top",
};

const EDITABLE_INPUT: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#e8e6e1",
  fontSize: 13,
  width: "100%",
  outline: "none",
  padding: 0,
};

export function ResultsTable({
  rows,
  fileName,
  editedFornitori,
  editedDescrizioni,
  onFornitoreChange,
  onDescrizioneChange,
  onNewFile,
  onDownload,
}: ResultsTableProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onNewFile}
            style={{
              background: "transparent",
              border: "1px solid #2a2a30",
              borderRadius: 6,
              color: "#6b6b70",
              fontSize: 13,
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            ← Nuovo file
          </button>
          <span style={{ fontSize: 13, color: "#6b6b70" }}>
            {fileName} — <strong style={{ color: "#e8e6e1" }}>{rows.length}</strong> righe
          </span>
        </div>

        <button
          onClick={onDownload}
          style={{
            background: "#f59e0b",
            border: "none",
            borderRadius: 6,
            color: "#0a0a0b",
            fontSize: 13,
            fontWeight: 600,
            padding: "6px 16px",
            cursor: "pointer",
          }}
        >
          Scarica CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #1a1a1e" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
          <thead>
            <tr style={{ background: "#111114" }}>
              {["Data", "Fornitore", "Descrizione", "Imponibile"].map((h) => (
                <th
                  key={h}
                  style={{
                    ...CELL,
                    color: "#6b6b70",
                    fontWeight: 500,
                    textAlign: "left",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const fornitore = editedFornitori[row.idx] ?? row.fornitore;
              const descrizione = editedDescrizioni[row.idx] ?? row.descrizione;
              return (
                <tr key={row.idx} style={{ background: "transparent" }}>
                  <td style={{ ...CELL, whiteSpace: "nowrap", color: "#9b9ba0" }}>{row.data}</td>
                  <td style={{ ...CELL, minWidth: 180 }}>
                    <input
                      style={EDITABLE_INPUT}
                      value={fornitore}
                      onChange={(e) => onFornitoreChange(row.idx, e.target.value)}
                    />
                  </td>
                  <td style={{ ...CELL, minWidth: 260 }}>
                    <input
                      style={EDITABLE_INPUT}
                      value={descrizione}
                      onChange={(e) => onDescrizioneChange(row.idx, e.target.value)}
                    />
                  </td>
                  <td style={{ ...CELL, whiteSpace: "nowrap", textAlign: "right" }}>
                    {row.imponibile}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
