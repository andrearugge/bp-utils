"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/fatture", label: "Classifica fatture" },
  { href: "/prima-nota", label: "Classifica prima nota" },
  { href: "/pulizia-spese", label: "Pulizia spese FattureInCloud" },
  { href: "/merge-csv", label: "Merge CSV" },
  { href: "/formatta-fatture", label: "Formatta Fatture e Ndc" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50 }}>
      {/* Top bar — brand only */}
      <div style={{ background: "#0d0d0f", borderBottom: "1px solid #1a1a1e" }}>
        <div style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 20px",
          height: 48,
          display: "flex",
          alignItems: "center",
        }}>
          <Link
            href="/"
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "#e8e6e1",
              textDecoration: "none",
              letterSpacing: "-0.2px",
            }}
          >
            Business Plan Tools
          </Link>
        </div>
      </div>

      {/* Subnav — page links */}
      <div style={{ background: "#0a0a0b", borderBottom: "1px solid #1a1a1e", overflowX: "auto" }}>
        <div style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 20px",
          height: 40,
          display: "flex",
          alignItems: "stretch",
          gap: 0,
          whiteSpace: "nowrap",
        }}>
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return <SubNavLink key={href} href={href} label={label} isActive={isActive} />;
          })}
        </div>
      </div>
    </header>
  );
}

function SubNavLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      style={{
        fontSize: 12,
        fontWeight: isActive ? 600 : 400,
        color: isActive ? "#f59e0b" : hovered ? "#e8e6e1" : "#6b6b70",
        textDecoration: "none",
        padding: "0 12px",
        display: "flex",
        alignItems: "center",
        borderBottom: isActive ? "2px solid #f59e0b" : "2px solid transparent",
        transition: "color 0.15s, border-color 0.15s",
        flexShrink: 0,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </Link>
  );
}
