"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { FileText, FileSpreadsheet, Lock } from "lucide-react";
import { PinModal } from "@/components/PinModal";

const ADMIN_STORAGE_KEY = "bp-admin-unlocked";

const TOOLS = [
  {
    href: "/fatture",
    Icon: FileText,
    title: "Classifica fatture",
    description:
      "Carica PDF di fatture e ricevute, estrai i dati automaticamente e scarica il CSV per il Business Plan",
  },
  {
    href: "/prima-nota",
    Icon: FileSpreadsheet,
    title: "Classifica prima nota",
    description:
      "Carica il CSV della prima nota dalla commercialista, classifica le voci e scarica il CSV per il Business Plan",
  },
  {
    href: "/pulizia-spese",
    Icon: FileSpreadsheet,
    title: "Pulizia spese FattureInCloud",
    description:
      "Carica l'export XLS di FattureInCloud e convertilo nel formato Business Plan",
  },
  {
    href: "/merge-csv",
    Icon: FileText,
    title: "Merge CSV",
    description:
      "Unisci più file CSV in formato Business Plan in un unico file con una sola intestazione",
  },
  {
    href: "/formatta-fatture",
    Icon: FileSpreadsheet,
    title: "Formatta Fatture e Ndc",
    description:
      "Carica i file XLS di fatture e note di credito e genera un CSV unificato con i valori delle Ndc negativi",
  },
  {
    href: "/invia-bp",
    Icon: FileText,
    title: "Invio dati a Business Plan",
    description:
      "Carica un CSV e aggiungilo in append a una tab del tuo Google Sheet con validazione delle colonne",
  },
];

const ADMIN_TOOLS = [
  {
    href: "#",
    Icon: Lock,
    title: "Strumento Admin",
    description: "Placeholder — sostituisci con il primo strumento admin.",
    admin: true,
  },
];

type Tool = { href: string; Icon: React.ElementType; title: string; description: string };

function ToolGrid({
  tools,
  hovered,
  setHovered,
  offset,
}: {
  tools: Tool[];
  hovered: number | null;
  setHovered: (i: number | null) => void;
  offset: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 20,
        width: "100%",
      }}
    >
      {tools.map(({ href, Icon, title, description }, i) => {
        const idx = offset + i;
        return (
          <Link
            key={href + idx}
            href={href}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              padding: 28,
              background: "#111113",
              border: `1px solid ${hovered === idx ? "#f59e0b" : "#1a1a1e"}`,
              borderRadius: "var(--radius)",
              textDecoration: "none",
              transition: "border-color 0.15s",
              cursor: "pointer",
            }}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon
                size={22}
                style={{
                  color: hovered === idx ? "#f59e0b" : "#6b6b70",
                  transition: "color 0.15s",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 16, fontWeight: 600, color: "#e8e6e1" }}>
                {title}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#6b6b70", lineHeight: 1.65 }}>
              {description}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    setIsAdminMode(localStorage.getItem(ADMIN_STORAGE_KEY) === "1");
  }, []);

  const handleToggle = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    } else {
      setShowPinModal(true);
    }
  };

  const handlePinSuccess = () => {
    setIsAdminMode(true);
    localStorage.setItem(ADMIN_STORAGE_KEY, "1");
    setShowPinModal(false);
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
  };

  return (
    <>
      {showPinModal && (
        <PinModal onSuccess={handlePinSuccess} onCancel={handlePinCancel} />
      )}

      <main
        style={{
          background: "#0a0a0b",
          minHeight: "100vh",
          color: "#e8e6e1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 900,
            padding: "60px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Header row */}
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 32,
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: "#e8e6e1",
                letterSpacing: "-0.3px",
              }}
            >
              Strumenti
            </span>

            <button
              type="button"
              onClick={handleToggle}
              role="switch"
              aria-checked={isAdminMode}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                userSelect: "none",
                background: "none",
                border: "none",
                padding: 0,
                color: "inherit",
                font: "inherit",
              }}
            >
              <span style={{ fontSize: 13, color: "#6b6b70" }}>Admin view</span>
              <span
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  background: isAdminMode ? "#f59e0b" : "#2a2a30",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: isAdminMode ? 21 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#e8e6e1",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                  }}
                />
              </span>
            </button>
          </div>

          {/* Main tools grid */}
          <ToolGrid tools={TOOLS} hovered={hovered} setHovered={setHovered} offset={0} />

          {/* Admin section */}
          {isAdminMode && (
            <div style={{ width: "100%", marginTop: 48 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: "#e8e6e1",
                    letterSpacing: "-0.2px",
                  }}
                >
                  Strumenti admin
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#f59e0b",
                    background: "rgba(245,158,11,0.12)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    borderRadius: 4,
                    padding: "2px 8px",
                  }}
                >
                  Admin
                </span>
              </div>
              <ToolGrid
                tools={ADMIN_TOOLS}
                hovered={hovered}
                setHovered={setHovered}
                offset={TOOLS.length}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
