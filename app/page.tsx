"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Game } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useReveal } from "./hooks/useReveal";
import { FloatingSilhouettes } from "@/components/FloatingSilhouettes";

const C = "currentColor";

function FeatureIcon({ kind }: { kind: string }) {
  if (kind === "GAMEPAD") return (
    <svg className="ft-icon" viewBox="0 0 16 16"><g fill={C}>
      <rect x="2" y="6" width="12" height="6"/>
      <rect x="0" y="8" width="2" height="4"/><rect x="14" y="8" width="2" height="4"/>
      <rect x="3" y="8" width="2" height="2"/><rect x="2" y="9" width="4" height="0.5"/>
      <rect x="11" y="7" width="1.5" height="1.5"/><rect x="11" y="10" width="1.5" height="1.5"/>
    </g></svg>
  );
  if (kind === "FREE") return (
    <svg className="ft-icon" viewBox="0 0 16 16"><g fill={C}>
      <rect x="3" y="3" width="10" height="10" fill="none" stroke={C} strokeWidth="1.5"/>
      <rect x="5" y="6" width="1.5" height="4"/><rect x="5" y="6" width="4" height="1.5"/><rect x="5" y="8" width="3" height="1"/>
      <rect x="10" y="6" width="1.5" height="4"/>
    </g></svg>
  );
  if (kind === "TROPHY") return (
    <svg className="ft-icon" viewBox="0 0 16 16"><g fill={C}>
      <rect x="3" y="2" width="10" height="2"/>
      <rect x="3" y="2" width="2" height="6"/><rect x="11" y="2" width="2" height="6"/>
      <rect x="5" y="8" width="6" height="2"/>
      <rect x="7" y="10" width="2" height="3"/>
      <rect x="5" y="13" width="6" height="1.5"/>
      <rect x="1" y="3" width="2" height="3"/><rect x="13" y="3" width="2" height="3"/>
    </g></svg>
  );
  if (kind === "ROCKET") return (
    <svg className="ft-icon" viewBox="0 0 16 16"><g fill={C}>
      <rect x="7" y="1" width="2" height="2"/>
      <rect x="6" y="3" width="4" height="2"/>
      <rect x="5" y="5" width="6" height="6"/>
      <rect x="4" y="11" width="2" height="2"/><rect x="10" y="11" width="2" height="2"/>
      <rect x="7" y="6" width="2" height="2" fill="#0a0a0f"/>
      <rect x="6" y="13" width="1" height="2"/><rect x="9" y="13" width="1" height="2"/>
    </g></svg>
  );
  return null;
}

const FEATURES = [
  { i: "GAMEPAD", t: "JUEGOS CLÁSICOS",   d: "Arkanoid, Tetris, Snake y muchos más. Los mejores arcades de todos los tiempos en un solo lugar.", c: "cyan" },
  { i: "FREE",    t: "100% GRATIS",        d: "Sin suscripciones, sin pagos ocultos. Todos los juegos disponibles de forma gratuita.", c: "yellow" },
  { i: "TROPHY",  t: "LADDER BOARDS",     d: "Compite con jugadores de todo el mundo. Escala el ranking y demuestra quién es el mejor.", c: "magenta" },
  { i: "ROCKET",  t: "SIEMPRE CRECIENDO", d: "Agregamos nuevos juegos constantemente. Vuelve seguido, siempre habrá algo nuevo que jugar.", c: "green" },
];

const MOCK_SCORES = [
  { p: "NEONFOX",  g: "Caída",        s: 184220, t: "hace 2 min",  c: "magenta" },
  { p: "PX_KAI",   g: "Glotón",       s: 96400,  t: "hace 5 min",  c: "yellow" },
  { p: "Z3R0COOL", g: "Invasores",    s: 54190,  t: "hace 8 min",  c: "green" },
  { p: "VAULT_07", g: "Rocas",        s: 41200,  t: "hace 12 min", c: "cyan" },
  { p: "GLITCHA",  g: "Bloque Buster",s: 28450,  t: "hace 18 min", c: "cyan" },
  { p: "ARKADYA",  g: "Serpentina",   s: 7820,   t: "hace 24 min", c: "green" },
  { p: "CYBER_LU", g: "Ranaria",      s: 18900,  t: "hace 31 min", c: "yellow" },
];

const MOCK_TOP_PLAYERS = [
  { r: 1, p: "NEONFOX",  s: 312840 },
  { r: 2, p: "PX_KAI",   s: 248110 },
  { r: 3, p: "M00NRYU",  s: 196720 },
  { r: 4, p: "VAULT_07", s: 154300 },
  { r: 5, p: "GLITCHA",  s: 138900 },
];

const FAQS = [
  { q: "¿REALMENTE ES GRATIS?", a: "Sí. Arcade Vault es un proyecto sin fines de lucro hecho por amor a los clásicos. No hay versión \"premium\" escondida." },
  { q: "¿NECESITO CREAR CUENTA?", a: "No. Puedes jugar como invitado. Si quieres guardar tu puntuación y aparecer en el ranking, regístrate en 10 segundos." },
  { q: "¿CÓMO SOBREVIVEN SIN COBRAR?", a: "Es un proyecto comunitario. Si te gusta, compártelo. Esa es toda la moneda que aceptamos." },
];

function topRowClass(i: number) {
  if (i === 0) return "top-row top1";
  if (i === 1) return "top-row top2";
  if (i === 2) return "top-row top3";
  return "top-row";
}

export default function Home() {
  useReveal();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    createClient().from("games").select("*").limit(6).then(({ data }) => {
      if (data) setGames(data as Game[]);
    });
  }, []);

  return (
    <div className="home fade-in">
      {/* HERO */}
      <section className="home-hero">
        <FloatingSilhouettes />
        <div className="home-hero-inner">
          <div className="hero-eyebrow pixel neon-yellow">▸ INSERTA UNA MONEDA<span className="blink">_</span></div>
          <h1 className="home-title">
            <span className="line-1">EL ARCADE</span>
            <span className="line-2">CLÁSICO ESTÁ</span>
            <span className="line-3">DE VUELTA</span>
          </h1>
          <p className="home-sub">
            Juega los mejores clásicos directamente en tu navegador.<br />
            Sin descargas. Sin costo. Solo diversión.
          </p>
          <div className="home-ctas">
            <Link href="/biblioteca" className="btn xl pulse">▶  EXPLORAR JUEGOS</Link>
            <Link href="/auth" className="btn xl magenta">✦  CREAR CUENTA</Link>
          </div>
          <div className="hero-scroll" aria-hidden="true">
            <span>DESLIZA</span>
            <span className="arrow">▼</span>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-magenta">// 01</div>
          <h2 className="section-title">¿POR QUÉ ARCADE VAULT?</h2>
          <div className="section-rule"></div>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className={`feature-card ${f.c}`} style={{ transitionDelay: `${i * 80}ms` }}>
              <FeatureIcon kind={f.i} />
              <div className="ft-title pixel">{f.t}</div>
              <div className="ft-desc">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* GAMES PREVIEW */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-cyan">// 02</div>
          <h2 className="section-title">JUEGOS DISPONIBLES AHORA</h2>
          <div className="section-rule"></div>
        </div>
        <div className="mini-rail">
          {games.map((g) => (
            <Link key={g.id} href={`/detalle/${g.id}`} className="mini-card">
              <div className="mini-cover"><div className={`cover-bg ${g.cover}`}></div></div>
              <div className="mini-meta">
                <div className="mini-title">{g.title}</div>
                <div className="mini-cat">{g.cat}</div>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/biblioteca" className="btn lg">VER TODOS LOS JUEGOS →</Link>
        </div>
      </section>

      {/* STATS */}
      <section className="home-stats reveal">
        <div className="stats-inner">
          {[
            { n: "12+",    u: "JUEGOS",     s: "Y CONTANDO" },
            { n: "MILES",  u: "DE PARTIDAS",s: "JUGADAS CADA DÍA" },
            { n: "GLOBAL", u: "RANKING",    s: "COMPITE CON EL MUNDO" },
          ].map((st, i) => (
            <div key={i} className="stat-block" style={{ transitionDelay: `${i * 90}ms` }}>
              <div className="stat-n neon-yellow">{st.n}</div>
              <div className="stat-u pixel">{st.u}</div>
              <div className="stat-s">{st.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE ACTIVITY */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-yellow">// 03</div>
          <h2 className="section-title">ACTIVIDAD EN VIVO</h2>
          <div className="section-rule"></div>
        </div>
        <div className="activity-grid">
          <div className="activity-card">
            <div className="ac-head">
              <div className="ac-title pixel">▸ ÚLTIMAS PUNTUACIONES</div>
            </div>
            <div className="ticker">
              {MOCK_SCORES.map((r, i) => (
                <div key={i} className="tick-row" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className={`tk-p neon-${r.c}`}>{r.p}</span>
                  <span className="tk-mid">▸ {r.g}</span>
                  <span className="tk-s">+{r.s.toLocaleString("es-ES")}</span>
                  <span className="tk-t">{r.t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="activity-card">
            <div className="ac-head">
              <div className="ac-title pixel neon-magenta">▸ TOP JUGADORES · HOY</div>
              <Link href="/salon" className="lb-link">VER SALÓN →</Link>
            </div>
            <div className="top-list">
              {MOCK_TOP_PLAYERS.map((r, i) => (
                <div key={i} className={topRowClass(i)}>
                  <span className="tp-rk">#{String(r.r).padStart(2, "0")}</span>
                  <span className="tp-bar"></span>
                  <span className="tp-p">{r.p}</span>
                  <span className="tp-s">{r.s.toLocaleString("es-ES")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-green">// 04</div>
          <h2 className="section-title">PRECIOS</h2>
          <div className="section-rule"></div>
        </div>
        <div className="pricing-grid">
          <div className="price-card">
            <div className="pc-label pixel">PLAN ÚNICO</div>
            <div className="pc-name pixel">JUGADOR VAULT</div>
            <div className="pc-amount">
              <span className="pc-amount-n">$0</span>
              <span className="pc-amount-u">/ SIEMPRE</span>
            </div>
            <div className="pc-tag">SIN TRUCOS · SIN LETRA PEQUEÑA</div>
            <ul className="pc-list">
              <li>✔ Acceso a todos los juegos</li>
              <li>✔ Ranking global y salón de la fama</li>
              <li>✔ Sin anuncios entre partidas</li>
              <li>✔ Guarda tus puntuaciones</li>
              <li>✔ Nuevos juegos cada mes</li>
              <li>✔ Funciona en cualquier navegador</li>
            </ul>
            <Link href="/auth" className="btn xl pulse" style={{ width: "100%", textAlign: "center" }}>EMPEZAR GRATIS →</Link>
            <div className="pc-foot">No pedimos tarjeta. Nunca lo haremos.</div>
            <div className="pc-stamp pixel">FREE<br />PLAY</div>
          </div>

          <div className="pricing-faq">
            {FAQS.map((f, i) => (
              <div
                key={i}
                className="faq-item"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className={`faq-q pixel${openFaq === i ? " faq-q-open" : ""}`}>
                  {f.q}
                  <span>{openFaq === i ? "▲" : "▼"}</span>
                </div>
                {openFaq === i && <div className="faq-a">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="home-final reveal">
        <h2 className="final-title pixel">¿LISTO PARA JUGAR?</h2>
        <Link href="/biblioteca" className="btn xl pulse final-cta">INSERTAR MONEDA →</Link>
        <div className="final-tag">Gratis. Sin registro obligatorio. Empieza en segundos.</div>
      </section>
    </div>
  );
}
