"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserProvider";

export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const { handleLogin } = useUser();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleLogin(name || "PLAYER");
    router.push("/biblioteca");
  }

  function handleGuest() {
    handleLogin("GUEST");
    router.push("/biblioteca");
  }

  return (
    <div className="av-auth-wrap">
      <div className="auth-card fade-in">
        <div className="auth-header">
          <div className="mark" />
          <h2 className="pixel">ARCADE VAULT</h2>
          <p className="mono" style={{ color: "var(--ink-dim)", margin: "6px 0 0", fontSize: "12px", letterSpacing: "0.12em" }}>
            ACCEDE A TU CUENTA
          </p>
        </div>

        <div className="auth-tabs">
          <button className={tab === "login" ? "on" : ""} onClick={() => setTab("login")}>
            INICIAR SESIÓN
          </button>
          <button className={tab === "signup" ? "on" : ""} onClick={() => setTab("signup")}>
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>NOMBRE / TAG</label>
            <input
              type="text"
              maxLength={10}
              placeholder="PLAYER_01"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <label>CONTRASEÑA</label>
            <input
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          {tab === "signup" && (
            <div className="field slide-in">
              <label>EMAIL</label>
              <input
                type="email"
                placeholder="neo@vault.gg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn yellow lg"
            style={{ width: "100%", marginTop: "8px" }}
          >
            {tab === "login" ? "INICIAR SESIÓN" : "CREAR CUENTA"}
          </button>
        </form>

        <div className="auth-divider">O CONTINÚA CON</div>

        <div className="social">
          <button className="btn ghost">G GOOGLE</button>
          <button className="btn ghost">⚡ DISCORD</button>
        </div>

        <button
          className="btn ghost"
          style={{ width: "100%", marginTop: "12px" }}
          onClick={handleGuest}
        >
          ENTRAR COMO INVITADO
        </button>
      </div>
    </div>
  );
}
