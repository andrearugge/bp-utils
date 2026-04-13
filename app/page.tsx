"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, FileSpreadsheet } from "lucide-react";

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
];

export default function Home() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
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
        <h1
          style={{
            fontSize: 36,
            fontWeight: 300,
            color: "#e8e6e1",
            letterSpacing: "-0.5px",
            margin: "0 0 8px",
            textAlign: "center",
          }}
        >
          Business Plan Tools
        </h1>
        <p
          style={{
            color: "#6b6b70",
            fontSize: 15,
            margin: "0 0 48px",
            textAlign: "center",
          }}
        >
          Seleziona uno strumento
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
            width: "100%",
            maxWidth: 640,
          }}
        >
          {TOOLS.map(({ href, Icon, title, description }, i) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                padding: 28,
                background: "#111113",
                border: `1px solid ${hovered === i ? "#f59e0b" : "#1a1a1e"}`,
                borderRadius: "var(--radius)",
                textDecoration: "none",
                transition: "border-color 0.15s",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Icon
                  size={22}
                  style={{
                    color: hovered === i ? "#f59e0b" : "#6b6b70",
                    transition: "color 0.15s",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#e8e6e1",
                  }}
                >
                  {title}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#6b6b70",
                  lineHeight: 1.65,
                }}
              >
                {description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
