"use client";

import { useEffect, useState } from "react";

export interface GamepadOverlayProps {
  onUpPress?: () => void;
  onUpRelease?: () => void;
  onDownPress?: () => void;
  onDownRelease?: () => void;
  onLeftPress?: () => void;
  onLeftRelease?: () => void;
  onRightPress?: () => void;
  onRightRelease?: () => void;
  onActionAPress?: () => void;
  onActionARelease?: () => void;
  onActionBPress?: () => void;
  onActionBRelease?: () => void;
  labelA?: string;
  labelB?: string;
}

function btn(
  onPress?: () => void,
  onRelease?: () => void,
): React.HTMLAttributes<HTMLButtonElement> {
  return {
    onPointerDown: (e) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onPress?.();
    },
    onPointerUp: (e) => {
      e.preventDefault();
      onRelease?.();
    },
    onPointerLeave: () => onRelease?.(),
    onPointerCancel: () => onRelease?.(),
  };
}

export default function GamepadOverlay({
  onUpPress,
  onUpRelease,
  onDownPress,
  onDownRelease,
  onLeftPress,
  onLeftRelease,
  onRightPress,
  onRightRelease,
  onActionAPress,
  onActionARelease,
  onActionBPress,
  onActionBRelease,
  labelA = "A",
  labelB = "B",
}: GamepadOverlayProps) {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  if (!isTouch) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 24px 16px",
        background:
          "linear-gradient(180deg, rgba(10,10,20,0.95) 0%, rgba(6,6,14,0.98) 100%)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        gap: 16,
      }}
    >
      {/* ── D-pad ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 44px)",
          gridTemplateRows: "repeat(3, 44px)",
          gap: 3,
        }}
      >
        {/* row 1 */}
        <div />
        <DpadBtn label="▲" {...btn(onUpPress, onUpRelease)} />
        <div />
        {/* row 2 */}
        <DpadBtn label="◀" {...btn(onLeftPress, onLeftRelease)} />
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        />
        <DpadBtn label="▶" {...btn(onRightPress, onRightRelease)} />
        {/* row 3 */}
        <div />
        <DpadBtn label="▼" {...btn(onDownPress, onDownRelease)} />
        <div />
      </div>

      {/* ── Action buttons ── */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <ActionBtn
          label={labelB}
          color="#1a3aff"
          glow="rgba(26,58,255,0.55)"
          {...btn(onActionBPress, onActionBRelease)}
        />
        <ActionBtn
          label={labelA}
          color="#ff1f3a"
          glow="rgba(255,31,58,0.55)"
          {...btn(onActionAPress, onActionARelease)}
        />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DpadBtn({
  label,
  ...handlers
}: { label: string } & React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...handlers}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 6,
        color: "rgba(255,255,255,0.75)",
        fontSize: 16,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        transition: "background 80ms, transform 80ms",
        // active state handled via CSS in globals if needed
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(255,255,255,0.18)";
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.93)";
        handlers.onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(255,255,255,0.06)";
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        handlers.onPointerUp?.(e);
      }}
      onPointerLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(255,255,255,0.06)";
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        handlers.onPointerLeave?.(e);
      }}
      onPointerCancel={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(255,255,255,0.06)";
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        handlers.onPointerCancel?.(e);
      }}
    >
      {label}
    </button>
  );
}

function ActionBtn({
  label,
  color,
  glow,
  ...handlers
}: {
  label: string;
  color: string;
  glow: string;
} & React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...handlers}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: color,
        border: `2px solid rgba(255,255,255,0.15)`,
        boxShadow: `0 0 12px ${glow}, inset 0 1px 0 rgba(255,255,255,0.2)`,
        color: "#fff",
        fontSize: 15,
        fontWeight: 700,
        fontFamily: "monospace",
        letterSpacing: "0.05em",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        transition: "transform 80ms, box-shadow 80ms",
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.90)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 4px ${glow}`;
        handlers.onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 12px ${glow}, inset 0 1px 0 rgba(255,255,255,0.2)`;
        handlers.onPointerUp?.(e);
      }}
      onPointerLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 12px ${glow}, inset 0 1px 0 rgba(255,255,255,0.2)`;
        handlers.onPointerLeave?.(e);
      }}
      onPointerCancel={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 12px ${glow}, inset 0 1px 0 rgba(255,255,255,0.2)`;
        handlers.onPointerCancel?.(e);
      }}
    >
      {label}
    </button>
  );
}
