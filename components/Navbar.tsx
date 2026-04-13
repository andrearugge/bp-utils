"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/fatture", label: "Classifica fatture" },
  { href: "/prima-nota", label: "Classifica prima nota" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        background: "#0d0d0f",
        borderBottom: "1px solid #1a1a1e",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 20px",
          height: 52,
          display: "flex",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "#e8e6e1",
            textDecoration: "none",
            letterSpacing: "-0.2px",
            flexShrink: 0,
          }}
        >
          Business Plan Tools
        </Link>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: "#1a1a1e", flexShrink: 0 }} />

        {/* Nav links */}
        <div style={{ display: "flex", gap: 4 }}>
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <NavLink key={href} href={href} label={label} isActive={isActive} />
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      style={{
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        color: isActive ? "#f59e0b" : hovered ? "#e8e6e1" : "#6b6b70",
        textDecoration: "none",
        padding: "5px 10px",
        borderRadius: 6,
        background: isActive
          ? "rgba(245,158,11,0.08)"
          : hovered
          ? "rgba(255,255,255,0.04)"
          : "transparent",
        transition: "color 0.15s, background 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </Link>
  );
}
