import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import UserProvider from "@/components/UserProvider";
import ScoresMigrator from "@/components/ScoresMigrator";

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "Online gaming platform — players compete for points",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col">
        <UserProvider>
          <div className="av-bg" />
          <div className="av-noise" />
          <ScoresMigrator />
          <Nav />
          <main className="av-main relative z-10">{children}</main>
          <footer
            className="relative z-10 border-t text-center py-6"
            style={{ borderColor: "var(--line)" }}
          >
            <span className="pixel text-xs" style={{ color: "var(--ink-faint)", fontSize: "8px" }}>
              © 2026 ARCADE VAULT — INSERT COIN TO CONTINUE
            </span>
          </footer>
        </UserProvider>
      </body>
    </html>
  );
}
