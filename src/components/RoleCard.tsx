import { Search, Skull, Shield, Eye } from "lucide-react";
import type { PrivateRole } from "../types/game";

interface RoleCardProps {
  roleData: PrivateRole;
  players: { uid: string; displayName: string }[];
  onClose: () => void;
}

const CONFIG = {
  liberal: {
    label: "LIBERAL",
    badgeBg: "#2e7da3",
    badgeGrad: "radial-gradient(circle at 35% 35%, #4a9ec4, #1e6680)",
    ringColor: "#5bb8d4",
    textColor: "#1e6680",
    leafColor: "rgba(210,240,255,0.55)",
    borderColor: "#b0d8e8",
    description:
      "Enact 5 Liberal policies or eliminate Hitler to win. You don't know who the Fascists are — trust carefully.",
  },
  fascist: {
    label: "FASCIST",
    badgeBg: "#c94228",
    badgeGrad: "radial-gradient(circle at 35% 35%, #e05c3a, #9e2a12)",
    ringColor: "#e0614a",
    textColor: "#c04030",
    leafColor: "rgba(255,210,190,0.5)",
    borderColor: "#e8b0a0",
    description:
      "Help Hitler become Chancellor or enact 6 Fascist policies. Stay hidden among the Liberals.",
  },
  hitler: {
    label: "HITLER",
    badgeBg: "#1e1e1e",
    badgeGrad: "radial-gradient(circle at 35% 35%, #3a3a3a, #111)",
    ringColor: "#555",
    textColor: "#c03030",
    leafColor: "rgba(200,150,150,0.35)",
    borderColor: "#aaa",
    description:
      "Get elected Chancellor after 3 Fascist policies are enacted, or let the Fascists enact 6 policies to win.",
  },
};

export default function RoleCard({ roleData, players, onClose }: RoleCardProps) {
  const cfg = CONFIG[roleData.role];
  const knownNames = roleData.knownFascists
    .map((uid) => players.find((p) => p.uid === uid)?.displayName ?? uid)
    .filter(Boolean);

  const IconComp =
    roleData.role === "liberal" ? Shield : roleData.role === "fascist" ? Skull : Eye;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      {/* Card */}
      <div
        className="w-full max-w-[280px] rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background: "#f4e8d0",
          boxShadow: "0 0 0 2px #c8b89a, 0 20px 60px rgba(0,0,0,0.7)",
        }}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="pt-5 px-5 pb-0 space-y-1.5">
          <div className="flex items-center justify-center gap-2.5">
            <span
              className="font-black tracking-[0.18em] text-sm"
              style={{ color: "#2a2a2a", fontFamily: "Georgia, serif" }}
            >
              PARTY
            </span>
            {/* Magnifying glass logo */}
            <div className="relative w-5 h-5 flex items-center justify-center">
              <Search size={18} className="text-gray-700" strokeWidth={2.5} />
            </div>
            <span
              className="font-black tracking-[0.18em] text-sm"
              style={{ color: "#2a2a2a", fontFamily: "Georgia, serif" }}
            >
              MEMBERSHIP
            </span>
          </div>

          {/* Dotted separator */}
          <div className="flex items-center gap-[3px] px-1">
            {Array.from({ length: 28 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full"
                style={{ height: 2.5, background: "#2a2a2a" }}
              />
            ))}
          </div>
        </div>

        {/* ── Badge ───────────────────────────────────────────── */}
        <div className="py-5 flex justify-center">
          <div className="relative w-[168px] h-[168px]">
            {/* Outer dotted ring */}
            <div
              className="absolute inset-0 rounded-full border-[3px] border-dashed"
              style={{ borderColor: cfg.ringColor }}
            />

            {/* Decorative petal/leaf ring */}
            <LeafRing
              color={cfg.leafColor}
              role={roleData.role}
              radius={62}
            />

            {/* Main badge circle */}
            <div
              className="absolute inset-[18px] rounded-full flex items-center justify-center"
              style={{ background: cfg.badgeGrad }}
            >
              {/* Subtle inner texture ring */}
              <div
                className="absolute inset-3 rounded-full border border-white/10"
              />
              <IconComp
                size={62}
                strokeWidth={1.2}
                style={{ color: cfg.leafColor }}
              />
            </div>
          </div>
        </div>

        {/* ── Role label ──────────────────────────────────────── */}
        <div className="text-center px-5 pb-2">
          <span
            className="font-black text-3xl tracking-[0.18em]"
            style={{
              color: cfg.textColor,
              fontFamily: "Georgia, serif",
              textShadow: "0 1px 0 rgba(255,255,255,0.6)",
            }}
          >
            {cfg.label}
          </span>
        </div>

        {/* Thin rule */}
        <div className="mx-5 border-t" style={{ borderColor: cfg.borderColor }} />

        {/* ── Description ─────────────────────────────────────── */}
        <p
          className="text-center text-xs leading-relaxed px-6 py-3"
          style={{ color: "#5a4a3a" }}
        >
          {cfg.description}
        </p>

        {/* ── Known teammates ─────────────────────────────────── */}
        {knownNames.length > 0 && (
          <div
            className="mx-5 mb-3 rounded-xl p-3 space-y-1 border"
            style={{ background: "rgba(0,0,0,0.06)", borderColor: cfg.borderColor }}
          >
            <p
              className="text-xs font-black uppercase tracking-widest text-center"
              style={{ color: "#5a4a3a" }}
            >
              Your Team
            </p>
            {knownNames.map((name) => (
              <p
                key={name}
                className="font-bold text-sm text-center"
                style={{ color: "#2a2a2a" }}
              >
                {name}
              </p>
            ))}
          </div>
        )}

        {/* ── Close button ────────────────────────────────────── */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full font-black rounded-xl py-3 transition-all text-sm tracking-widest hover:opacity-90 active:scale-95"
            style={{
              background: cfg.textColor,
              color: "#f4e8d0",
              fontFamily: "Georgia, serif",
            }}
          >
            I UNDERSTAND
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Leaf / petal ring around the badge ───────────────────────────────────────

function LeafRing({
  color,
  role,
  radius,
}: {
  color: string;
  role: string;
  radius: number;
}) {
  // Liberal → rounder olive-leaf shapes; Fascist/Hitler → pointier scales
  const count = role === "liberal" ? 18 : 14;
  const W = role === "liberal" ? 9 : 7;
  const H = role === "liberal" ? 18 : 14;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i * 360) / count;
        const rad = (angle * Math.PI) / 180;
        const x = radius * Math.sin(rad);
        const y = -radius * Math.cos(rad);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: W,
              height: H,
              background: color,
              borderRadius: "50%",
              transform: `translate(-50%,-50%) translate(${x}px,${y}px) rotate(${angle}deg)`,
            }}
          />
        );
      })}
    </>
  );
}
