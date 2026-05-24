export type GameColor = "cyan" | "magenta" | "green" | "yellow";
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export interface User {
  name: string;
}

export const GAMES: Game[] = [
  {
    id: "bricks",
    title: "NEON BRICKS",
    short: "Rompe bloques a ritmo de neon.",
    long: "Destruye muros de ladrillos de colores con tu pelota de plasma. Cada nivel añade velocidad y patrones imposibles. ¿Hasta qué pantalla aguantas?",
    cat: "ARCADE",
    cover: "cover-bricks",
    color: "cyan",
    best: 148200,
    plays: "24.3K",
  },
  {
    id: "tetro",
    title: "TETRO VAULT",
    short: "Piezas que caen, líneas que explotan.",
    long: "El clásico de bloques llevado al extremo cyberpunk. Las piezas caen más rápido con cada nivel. Combina líneas para desbloquear el modo FRENÉTICO.",
    cat: "PUZZLE",
    cover: "cover-tetro",
    color: "magenta",
    best: 312500,
    plays: "61.7K",
  },
  {
    id: "snake",
    title: "PIXEL SNAKE",
    short: "Come, crece, sobrevive.",
    long: "Guía tu serpiente de píxeles por la arena CRT. Cada bocado la hace más larga y al mundo más peligroso. Un solo error y todo termina.",
    cat: "ARCADE",
    cover: "cover-snake",
    color: "green",
    best: 89400,
    plays: "38.1K",
  },
  {
    id: "glot",
    title: "GLOTON X",
    short: "Come fantasmas antes de que te coman.",
    long: "Navega laberintos oscuros devorando puntos de energía. Activa el modo TURBO para convertirte en el cazador. Los fantasmas aprenden de tus movimientos.",
    cat: "ARCADE",
    cover: "cover-glot",
    color: "yellow",
    best: 204600,
    plays: "45.9K",
  },
  {
    id: "invaders",
    title: "SPACE RAID",
    short: "La armada alienígena no para.",
    long: "Oleadas infinitas de invasores descienden sobre la Tierra. Tu cañón láser es la última defensa. Elimina los UFO bonus para multiplicar tu puntuación.",
    cat: "SHOOTER",
    cover: "cover-invaders",
    color: "green",
    best: 276800,
    plays: "52.4K",
  },
  {
    id: "rocas",
    title: "ROCAS DRIFT",
    short: "Asteroides en el vacío del espacio.",
    long: "Tu nave gira en el vacío mientras asteroides de todos los tamaños te rodean. Dispara, esquiva y sobrevive. Los fragmentos más pequeños son los más traicioneros.",
    cat: "SHOOTER",
    cover: "cover-rocas",
    color: "cyan",
    best: 193100,
    plays: "29.6K",
  },
  {
    id: "rana",
    title: "CYBER FROG",
    short: "Cruza la autopista del futuro.",
    long: "Las autopistas de datos nunca duermen. Lleva a tu rana digital al otro lado esquivando vehículos de luz y torrentes de información. Cada pantalla aumenta el caos.",
    cat: "ARCADE",
    cover: "cover-rana",
    color: "green",
    best: 67300,
    plays: "18.2K",
  },
  {
    id: "duelo",
    title: "PIXEL DUEL",
    short: "Un disparo, un ganador.",
    long: "El clásico duelo al píxel de vuelta. Dos jugadores, un solo proyectil por turno. Anticipa, apunta y dispara antes de que tu rival lo haga. Sin piedad.",
    cat: "VERSUS",
    cover: "cover-duelo",
    color: "magenta",
    best: 99999,
    plays: "11.8K",
  },
];

export const CATS: string[] = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];

export const PLAYERS: string[] = [
  "ACE", "ZXC", "NEO", "REX", "VEX", "KAI", "OBI", "RYU",
  "MAX", "JET", "SKY", "RAY", "DOC", "AXE", "FIN", "GUS",
];

export function seededScores(seed: number, count = 10): ScoreRow[] {
  const rows: ScoreRow[] = [];
  let s = seed;
  const next = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(s);
  };

  const baseScores = [320000, 280000, 245000, 210000, 185000, 162000, 141000, 122000, 104000, 88000, 74000, 62000];

  for (let i = 0; i < count; i++) {
    const playerIdx = next() % PLAYERS.length;
    const scoreVariance = next() % 15000;
    const base = baseScores[Math.min(i, baseScores.length - 1)];
    const day = (next() % 28) + 1;
    const month = (next() % 12) + 1;
    const year = 2025 + (next() % 2);
    rows.push({
      rank: i + 1,
      name: PLAYERS[playerIdx],
      score: base + scoreVariance - Math.floor(i * 8000),
      date: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
    });
  }

  return rows;
}
