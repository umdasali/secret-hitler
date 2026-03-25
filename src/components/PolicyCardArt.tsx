import { Feather, Skull } from "lucide-react";
import type { Policy } from "../types/game";
import { POLICY_ACCENT } from "../lib/policyColors";

// ── Full interactive card (Legislative phase) ─────────────────────────────────

export function PolicyCard({
  type,
  action,
  onClick,
}: {
  type: Policy;
  action: "discard" | "enact";
  onClick: () => void;
}) {
  const isLib = type === "L";
  const accent = POLICY_ACCENT[type];
  const accentLight = isLib ? "#e8f4fb" : "#fdf0ec";
  const label = isLib ? "LIBERAL" : "FASCIST";
  const actionLabel = action === "discard" ? "DISCARD" : "ENACT";
  const actionBg =
    action === "discard" ? "rgba(0,0,0,0.12)" : accent;
  const actionText = action === "enact" ? "#fff" : accent;

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col rounded-xl overflow-hidden transition-all duration-150 hover:scale-105 hover:-translate-y-1 active:scale-95 focus:outline-none"
      style={{
        width: 110,
        minHeight: 152,
        background: "#f4e8d0",
        border: `3px solid ${accent}`,
        boxShadow: `0 4px 16px rgba(0,0,0,0.35), 0 0 0 1px ${accentLight}`,
      }}
    >
      <DogEar color={accent} size={22} />

      <div className="flex-1 flex flex-col items-center px-2 pt-4 pb-1 gap-1">
        <div
          className="w-12 h-12 flex items-center justify-center rounded-full"
          style={{ background: `${accent}22` }}
        >
          {isLib
            ? <Feather size={28} strokeWidth={1.5} style={{ color: accent }} />
            : <Skull   size={28} strokeWidth={1.5} style={{ color: accent }} />}
        </div>

        <span
          className="font-black tracking-[0.12em] leading-none"
          style={{ fontSize: 15, color: accent, fontFamily: "Georgia, serif" }}
        >
          {label}
        </span>

        <DottedRule color={accent} count={18} />

        <span
          className="font-black tracking-[0.2em]"
          style={{ fontSize: 10, color: accent, opacity: 0.9 }}
        >
          ARTICLE
        </span>

        <DocLines color={accent} widths={[100, 90, 95, 80, 85]} height={3} />
      </div>

      <div
        className="py-1.5 text-center font-black tracking-widest"
        style={{
          fontSize: 9,
          background: actionBg,
          color: actionText,
          borderTop: `1.5px solid ${accent}44`,
        }}
      >
        {actionLabel}
      </div>
    </button>
  );
}

// ── Mini card for the policy boards (non-interactive) ─────────────────────────

export function PolicyCardMini({ type }: { type: Policy }) {
  const isLib = type === "L";
  const accent = POLICY_ACCENT[type];
  const label = isLib ? "LIBERAL" : "FASCIST";

  return (
    <div
      className="relative flex flex-col rounded-lg overflow-hidden w-full h-full"
      style={{
        background: "#f4e8d0",
        border: `2px solid ${accent}`,
        boxShadow: `0 2px 8px rgba(0,0,0,0.3)`,
        minHeight: 72,
      }}
    >
      <DogEar color={accent} size={14} />

      <div className="flex-1 flex flex-col items-center justify-center px-1 pt-2 pb-1 gap-0.5">
        {isLib
          ? <Feather size={16} strokeWidth={1.5} style={{ color: accent }} />
          : <Skull   size={16} strokeWidth={1.5} style={{ color: accent }} />}

        <span
          className="font-black tracking-[0.08em] leading-none"
          style={{ fontSize: 9, color: accent, fontFamily: "Georgia, serif" }}
        >
          {label}
        </span>

        <DottedRule color={accent} count={8} />

        <span
          className="font-black tracking-[0.15em]"
          style={{ fontSize: 6, color: accent, opacity: 0.8 }}
        >
          ARTICLE
        </span>

        <DocLines color={accent} widths={[90, 80, 85]} height={2} />
      </div>
    </div>
  );
}

// ── Face-down card ────────────────────────────────────────────────────────────

export function FaceDownCard({ size = "full" }: { size?: "full" | "mini" }) {
  const w = size === "full" ? 110 : undefined;
  const h = size === "full" ? 152 : 72;

  return (
    <div
      className="relative rounded-xl flex items-center justify-center"
      style={{
        width: w,
        minHeight: h,
        background: "linear-gradient(145deg,#1e293b,#0f172a)",
        border: "2px solid #334155",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-2 rounded-lg border border-slate-600/40" />
      <div className="absolute inset-4 rounded border border-slate-700/30" />
      <span
        className="text-slate-600 font-black"
        style={{ fontSize: size === "full" ? 30 : 16, fontFamily: "Georgia,serif" }}
      >
        ?
      </span>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DogEar({ color, size }: { color: string; size: number }) {
  return (
    <div className="absolute top-0 right-0" style={{ width: size, height: size }}>
      <div
        style={{
          position: "absolute", top: 0, right: 0,
          width: 0, height: 0,
          borderStyle: "solid",
          borderWidth: `0 ${size}px ${size}px 0`,
          borderColor: `transparent rgba(0,0,0,0.15) transparent transparent`,
        }}
      />
      <div
        style={{
          position: "absolute", top: 0, right: 0,
          width: 0, height: 0,
          borderStyle: "solid",
          borderWidth: `${size}px ${size}px 0 0`,
          borderColor: `${color} transparent transparent transparent`,
        }}
      />
    </div>
  );
}

function DottedRule({ color, count }: { color: string; count: number }) {
  return (
    <div className="flex gap-[2px] w-full px-1 my-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-full"
          style={{ height: 2, background: color, opacity: 0.5 }}
        />
      ))}
    </div>
  );
}

function DocLines({
  color,
  widths,
  height,
}: {
  color: string;
  widths: number[];
  height: number;
}) {
  return (
    <div className="w-full space-y-1 mt-0.5 px-1">
      {widths.map((w, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{ height, width: `${w}%`, background: color, opacity: 0.18 }}
        />
      ))}
    </div>
  );
}
