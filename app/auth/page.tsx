"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/UserProvider";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

type Tab = "login" | "signup";

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifyEmail, setVerifyEmail] = useState(false);

  const { handleLogin } = useUser();
  const router = useRouter();
  const supabase = createClient();

  function getCallbackUrl() {
    return `${window.location.origin}/auth/callback`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (tab === "signup") {
      const tag = username.toUpperCase().slice(0, 10);
      if (!tag) { setError("Elige un tag de jugador."); setLoading(false); return; }

      if (!PASSWORD_REGEX.test(pass)) {
        setError("La contraseña debe tener mínimo 8 caracteres e incluir mayúsculas, minúsculas, números y símbolos.");
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { username: tag },
          emailRedirectTo: getCallbackUrl(),
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already registered")) {
          setError("Email ya registrado. Inicia sesión.");
        } else {
          setError(signUpError.message);
        }
      } else {
        setVerifyEmail(true);
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes("invalid")) {
          setError("Email o contraseña incorrectos.");
        } else if (signInError.message.toLowerCase().includes("email not confirmed")) {
          setError("Confirma tu email antes de entrar.");
        } else {
          setError(signInError.message);
        }
      } else {
        router.push("/biblioteca");
        router.refresh();
      }
    }

    setLoading(false);
  }

  async function handleOAuth(provider: "google" | "github") {
    setError("");
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: getCallbackUrl() },
    });
  }

  function handleGuest() {
    handleLogin("GUEST");
    router.push("/biblioteca");
  }

  function switchTab(t: Tab) {
    setTab(t);
    setError("");
    setVerifyEmail(false);
  }

  if (verifyEmail) {
    return (
      <div className="av-auth-wrap">
        <div className="auth-card fade-in" style={{ textAlign: "center" }}>
          <div className="auth-header">
            <div className="mark" />
            <h2 className="pixel">ARCADE VAULT</h2>
          </div>
          <p className="mono" style={{ color: "var(--cyan)", fontSize: "13px", margin: "24px 0 8px", letterSpacing: "0.08em" }}>
            REVISA TU CORREO
          </p>
          <p className="mono" style={{ color: "var(--ink-dim)", fontSize: "11px", lineHeight: 1.6 }}>
            Te enviamos un enlace de confirmación a <strong>{email}</strong>.
            Haz clic en el enlace para activar tu cuenta.
          </p>
          <button
            className="btn ghost"
            style={{ width: "100%", marginTop: "24px" }}
            onClick={() => setVerifyEmail(false)}
          >
            VOLVER AL LOGIN
          </button>
        </div>
      </div>
    );
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
          <button className={tab === "login" ? "on" : ""} onClick={() => switchTab("login")}>
            INICIAR SESIÓN
          </button>
          <button className={tab === "signup" ? "on" : ""} onClick={() => switchTab("signup")}>
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {tab === "signup" && (
            <div className="field slide-in">
              <label>TAG DE JUGADOR</label>
              <input
                type="text"
                maxLength={10}
                placeholder="PLAYER_01"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}

          <div className="field">
            <label>EMAIL</label>
            <input
              type="email"
              placeholder="neo@vault.gg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>CONTRASEÑA</label>
            <input
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && (
            <p
              className="mono"
              style={{ color: "var(--magenta)", fontSize: "10px", margin: "0 0 10px", letterSpacing: "0.06em" }}
            >
              ⚠ {error}
            </p>
          )}

          <button
            type="submit"
            className="btn yellow lg"
            style={{ width: "100%", marginTop: "8px" }}
            disabled={loading}
          >
            {loading ? "..." : tab === "login" ? "INICIAR SESIÓN" : "CREAR CUENTA"}
          </button>
        </form>

        <div className="auth-divider">O CONTINÚA CON</div>

        <div className="social">
          <button className="btn ghost" onClick={() => handleOAuth("google")} disabled={loading}>
            G GOOGLE
          </button>
          <button className="btn ghost" onClick={() => handleOAuth("github")} disabled={loading}>
            ⌥ GITHUB
          </button>
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
