"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useUser } from "@/components/UserProvider";

export default function Nav() {
  const pathname = usePathname();
  const { user, handleSignOut } = useUser();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/biblioteca", label: "BIBLIOTECA" },
    { href: "/salon", label: "SALÓN" },
    { href: "/auth", label: "AUTH" },
    { href: "/acerca-de", label: "ACERCA DE" },
  ];

  return (
    <>
      <nav className="av-nav relative z-50">
        <Link href="/" className="logo">
          <div className="logo-mark" />
          <span className="logo-text neon-cyan">ARCADE VAULT</span>
        </Link>

        <div className="links">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={pathname.startsWith(href) ? "active" : ""}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="spacer" />

        <div className="coin-counter">
          <div className="coin" />
          <span>8 CREDITS</span>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="pixel neon-yellow" style={{ fontSize: "9px" }}>
              {user.name}
            </span>
            <button className="btn ghost" style={{ padding: "8px 14px", fontSize: "8px" }} onClick={handleSignOut}>
              SALIR
            </button>
          </div>
        ) : (
          <Link href="/auth" className="btn auth-btn" style={{ padding: "8px 14px", fontSize: "9px" }}>
            INICIAR SESIÓN
          </Link>
        )}

        <button
          className="hamburger btn ghost"
          style={{ padding: "8px 12px" }}
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
        >
          ☰
        </button>
      </nav>

      {/* Mobile backdrop */}
      <div
        className={`av-mobile-backdrop ${open ? "open" : ""}`}
        onClick={() => setOpen(false)}
      />

      {/* Mobile panel */}
      <div className={`av-mobile-panel ${open ? "open" : ""}`}>
        <button
          className="btn ghost self-end mb-4"
          style={{ padding: "6px 10px", fontSize: "10px" }}
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={pathname.startsWith(href) ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        ))}
        <div className="divider" />
        {user ? (
          <>
            <span className="pixel neon-yellow" style={{ fontSize: "9px", padding: "14px 12px" }}>
              {user.name}
            </span>
            <button
              className="btn ghost"
              onClick={() => { handleSignOut(); setOpen(false); }}
            >
              CERRAR SESIÓN
            </button>
          </>
        ) : (
          <Link href="/auth" className="btn" onClick={() => setOpen(false)}>
            INICIAR SESIÓN
          </Link>
        )}
      </div>
    </>
  );
}
