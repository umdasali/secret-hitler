import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Shield, Zap, Skull, ArrowLeft } from "lucide-react";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import type { LeaderboardEntry } from "../types/game";

// ── Rank badge for top 3 ───────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const configs = [
    { roman: "I",   bg: "#7a5c10", border: "#c9a84c", text: "#ffd97a", size: 38 },
    { roman: "II",  bg: "#3a3a3a", border: "#9ca3af", text: "#e5e7eb", size: 36 },
    { roman: "III", bg: "#5c3010", border: "#c87a3a", text: "#f0a870", size: 34 },
  ];
  const cfg = configs[rank - 1];
  return (
    <div
      className="flex items-center justify-center font-black select-none"
      style={{
        width: cfg.size + 4,
        height: cfg.size + 4,
        background: cfg.bg,
        border: `2px solid ${cfg.border}`,
        borderRadius: 4,
        color: cfg.text,
        fontSize: rank === 1 ? 15 : 13,
        fontFamily: "Georgia, serif",
        letterSpacing: "0.05em",
        boxShadow: `0 0 8px ${cfg.border}55`,
        flexShrink: 0,
      }}
    >
      {cfg.roman}
    </div>
  );
}

// ── Decorative divider ─────────────────────────────────────────────────────
function RuleDivider() {
  return (
    <div className="flex items-center gap-3 w-full my-1">
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, #6b4e22)" }} />
      <div style={{ width: 5, height: 5, background: "#c9a84c", transform: "rotate(45deg)" }} />
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, #6b4e22)" }} />
    </div>
  );
}

// ── Corner bracket decoration ──────────────────────────────────────────────
function CornerBrackets({ color = "#6b4e22", size = 10 }: { color?: string; size?: number }) {
  const s = size;
  const b = 2;
  const style = (top: boolean, left: boolean) => ({
    position: "absolute" as const,
    top: top ? 0 : undefined,
    bottom: top ? undefined : 0,
    left: left ? 0 : undefined,
    right: left ? undefined : 0,
    width: s,
    height: s,
    borderTop:    top  ? `${b}px solid ${color}` : "none",
    borderBottom: !top ? `${b}px solid ${color}` : "none",
    borderLeft:   left ? `${b}px solid ${color}` : "none",
    borderRight:  !left ? `${b}px solid ${color}` : "none",
  });
  return (
    <>
      <div style={style(true, true)} />
      <div style={style(true, false)} />
      <div style={style(false, true)} />
      <div style={style(false, false)} />
    </>
  );
}

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const q = query(
        collection(db, "users"),
        orderBy("wins", "desc"),
        limit(50)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({
        uid: d.id,
        displayName: d.data().displayName ?? "Unknown",
        photoURL: d.data().photoURL ?? "",
        gamesPlayed: d.data().gamesPlayed ?? 0,
        wins: d.data().wins ?? 0,
        winsByRole: {
          liberal: d.data().winsByRole?.liberal ?? 0,
          fascist: d.data().winsByRole?.fascist ?? 0,
          hitler:  d.data().winsByRole?.hitler  ?? 0,
        },
      })) as LeaderboardEntry[];
      setEntries(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{
        background: "radial-gradient(ellipse at top, #1c1208 0%, #0a0804 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* ── Top navigation bar ───────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 px-6 py-3 border-b"
        style={{ borderColor: "#3a2a14", background: "#0e0b05ee" }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm transition-all hover:opacity-80"
          style={{ color: "#c9a84c", fontFamily: "Georgia, serif", letterSpacing: "0.05em" }}
        >
          <ArrowLeft size={14} />
          RETREAT
        </button>
        <div className="flex-1 h-px" style={{ background: "#3a2a14" }} />
        <span
          className="text-xs tracking-[0.3em] uppercase"
          style={{ color: "#6b4e22", fontFamily: "Georgia, serif" }}
        >
          TOP SECRET
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* ── Masthead ─────────────────────────────────────────────────── */}
        <div className="text-center mb-8 relative">
          {/* Top stamp line */}
          <div
            className="inline-block border px-4 py-0.5 mb-4 tracking-[0.45em] text-xs"
            style={{
              borderColor: "#8b1a1a",
              color: "#8b1a1a",
              fontFamily: "Georgia, serif",
              transform: "rotate(-1.2deg)",
            }}
          >
            CLASSIFIED
          </div>

          {/* Title */}
          <h1
            className="font-black uppercase leading-none"
            style={{
              fontSize: "clamp(26px, 7vw, 48px)",
              color: "#d4c8a0",
              fontFamily: "Georgia, serif",
              letterSpacing: "0.18em",
              textShadow: "0 2px 12px #00000080",
            }}
          >
            HALL OF SHADOWS
          </h1>

          <RuleDivider />

          <p
            className="tracking-[0.35em] text-xs mt-1"
            style={{ color: "#7a6a4a", fontFamily: "Georgia, serif" }}
          >
            FIELD OPERATIVES — VICTORY RECORD
          </p>

          {/* Decorative emblem */}
          <div className="flex justify-center mt-4">
            <div
              className="relative flex items-center justify-center"
              style={{
                width: 56,
                height: 56,
                border: "2px solid #6b4e22",
                borderRadius: "50%",
                background: "#12100800",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 4,
                  border: "1px dashed #4a3820",
                  borderRadius: "50%",
                }}
              />
              <span style={{ color: "#c9a84c", fontSize: 22, fontFamily: "Georgia, serif" }}>⚔</span>
            </div>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────── */}
        {loading ? (
          <div
            className="text-center py-20 tracking-[0.2em] text-sm"
            style={{ color: "#6b4e22", fontFamily: "Georgia, serif" }}
          >
            RETRIEVING DOSSIERS…
          </div>
        ) : entries.length === 0 ? (
          <div
            className="text-center py-20 tracking-[0.2em] text-sm"
            style={{ color: "#4a3820", fontFamily: "Georgia, serif" }}
          >
            NO OPERATIVES ON RECORD
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, idx) => {
              const rank = idx + 1;
              const winRate =
                entry.gamesPlayed > 0
                  ? Math.round((entry.wins / entry.gamesPlayed) * 100)
                  : 0;

              const isTop3 = rank <= 3;
              const cardBg    = isTop3 ? "#1e180a" : "#130f07";
              const cardBorder = rank === 1 ? "#c9a84c" : rank === 2 ? "#7a8490" : rank === 3 ? "#c87a3a" : "#2e2010";
              const nameColor  = isTop3 ? "#e8d8a8" : "#b8a878";

              return (
                <div
                  key={entry.uid}
                  className="relative flex items-center gap-4 px-5 py-4"
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 4,
                    boxShadow: isTop3 ? `0 2px 16px ${cardBorder}22` : "none",
                  }}
                >
                  <CornerBrackets color={cardBorder} size={isTop3 ? 10 : 7} />

                  {/* Rank */}
                  <div className="w-10 flex justify-center items-center flex-shrink-0">
                    {isTop3 ? (
                      <RankBadge rank={rank} />
                    ) : (
                      <span
                        className="font-black"
                        style={{
                          color: "#4a3820",
                          fontFamily: "Georgia, serif",
                          fontSize: 13,
                          letterSpacing: "0.05em",
                        }}
                      >
                        #{rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar — styled as a dossier photo */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center font-black text-sm overflow-hidden relative"
                    style={{
                      width: 42,
                      height: 42,
                      border: `2px solid ${cardBorder}`,
                      background: "#0e0b05",
                      color: "#c9a84c",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    {entry.photoURL ? (
                      <img
                        src={entry.photoURL}
                        alt=""
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                          filter: "sepia(0.25) contrast(1.05)",
                        }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      entry.displayName[0]?.toUpperCase()
                    )}
                  </div>

                  {/* Name + role stats */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-black truncate leading-tight"
                      style={{
                        color: nameColor,
                        fontFamily: "Georgia, serif",
                        letterSpacing: "0.06em",
                        fontSize: 14,
                      }}
                    >
                      {entry.displayName.toUpperCase()}
                    </p>

                    {/* Role wins */}
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <span
                        className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                        style={{ color: "#4a80b0", background: "#4a80b015", fontFamily: "Georgia, serif", letterSpacing: "0.04em" }}
                        title="Liberal wins"
                      >
                        <Shield size={9} strokeWidth={2} />
                        <span style={{ fontSize: 9 }}>LIBERAL</span>
                        <span className="font-black">{entry.winsByRole.liberal}</span>
                      </span>
                      <span
                        className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                        style={{ color: "#b03a2a", background: "#b03a2a15", fontFamily: "Georgia, serif", letterSpacing: "0.04em" }}
                        title="Fascist wins"
                      >
                        <Zap size={9} strokeWidth={2} />
                        <span style={{ fontSize: 9 }}>FASCIST</span>
                        <span className="font-black">{entry.winsByRole.fascist}</span>
                      </span>
                      <span
                        className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                        style={{ color: "#7a5a5a", background: "#7a5a5a15", fontFamily: "Georgia, serif", letterSpacing: "0.04em" }}
                        title="Hitler wins"
                      >
                        <Skull size={9} strokeWidth={2} />
                        <span style={{ fontSize: 9 }}>HITLER</span>
                        <span className="font-black">{entry.winsByRole.hitler}</span>
                      </span>
                    </div>
                  </div>

                  {/* Right-side stats */}
                  <div className="text-right flex-shrink-0">
                    <p
                      className="font-black leading-none"
                      style={{
                        fontSize: 22,
                        color: isTop3 ? "#c9a84c" : "#6b4e22",
                        fontFamily: "Georgia, serif",
                      }}
                    >
                      {entry.wins}
                    </p>
                    <p
                      className="text-xs mt-0.5 tracking-[0.08em]"
                      style={{ color: "#4a3820", fontFamily: "Georgia, serif" }}
                    >
                      {entry.gamesPlayed} OPS
                    </p>
                    <p
                      className="text-xs font-black tracking-[0.06em]"
                      style={{
                        color: winRate >= 60 ? "#b09030" : winRate >= 40 ? "#7a6a4a" : "#4a3820",
                        fontFamily: "Georgia, serif",
                      }}
                    >
                      {winRate}%
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Footer stamp */}
            <div className="text-center pt-6">
              <RuleDivider />
              <p
                className="mt-3 text-xs tracking-[0.35em] uppercase"
                style={{ color: "#3a2810", fontFamily: "Georgia, serif" }}
              >
                Compiled by order of the party — do not distribute
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
