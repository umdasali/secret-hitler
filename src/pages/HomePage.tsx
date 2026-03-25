import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, DoorOpen, Bot, Trophy, LogOut, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createGame, joinGame } from "../lib/gameActions";
import type { Player } from "../types/game";

// ── Decorative crest / emblem ─────────────────────────────────────────────────

function Crest() {
  return (
    <div className="relative w-28 h-28 mx-auto select-none">
      {/* Outer dashed ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ border: "2px dashed #5a0808" }}
      />
      {/* 12 marker dots */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const r = 51;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: i % 3 === 0 ? 5 : 3,
              height: i % 3 === 0 ? 5 : 3,
              background: i % 3 === 0 ? "#7a0a0a" : "#3a0606",
              left: `calc(50% + ${r * Math.sin(angle)}px - ${i % 3 === 0 ? 2.5 : 1.5}px)`,
              top: `calc(50% - ${r * Math.cos(angle)}px - ${i % 3 === 0 ? 2.5 : 1.5}px)`,
            }}
          />
        );
      })}
      {/* Solid inner ring */}
      <div
        className="absolute inset-[10px] rounded-full"
        style={{ border: "1px solid #3a0808" }}
      />
      {/* Centre disc */}
      <div
        className="absolute inset-[14px] rounded-full flex items-center justify-center"
        style={{
          background: "radial-gradient(circle at 38% 38%, #1a0404, #000)",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.8)",
        }}
      >
        <Shield size={32} strokeWidth={1} style={{ color: "#700000" }} />
      </div>
    </div>
  );
}

// ── Dossier card ──────────────────────────────────────────────────────────────

interface DossierProps {
  fileNo: string;
  icon: ReactNode;
  operation: string;
  title: string;
  description: string;
  accent: string;        // border / icon color
  accentDim: string;    // muted version
  btnLabel: string;
  onClick: () => void;
  disabled?: boolean;
  children?: ReactNode;
}

function DossierCard({
  fileNo, icon, operation, title, description,
  accent, accentDim, btnLabel, onClick, disabled, children,
}: DossierProps) {
  return (
    <div
      className="flex-1 flex flex-col rounded overflow-hidden"
      style={{ background: "#0c0303", border: `1px solid ${accentDim}` }}
    >
      {/* Header ribbon */}
      <div
        className="flex items-center justify-between px-4 py-1.5"
        style={{ background: "#110202" }}
      >
        <span className="font-black tracking-[0.4em]" style={{ fontSize: 8, color: accentDim }}>
          CLASSIFIED
        </span>
        <span className="font-mono font-bold" style={{ fontSize: 8, color: accentDim }}>
          {fileNo}
        </span>
      </div>

      {/* Accent top line */}
      <div className="h-[2px]" style={{ background: `linear-gradient(to right, ${accent}, transparent)` }} />

      {/* Body */}
      <div className="flex-1 p-5 flex flex-col gap-4">
        {/* Icon + label */}
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "#110000", border: `1px solid ${accent}40` }}
          >
            <div style={{ color: accent }}>{icon}</div>
          </div>
          <div>
            <p className="font-bold tracking-[0.3em] leading-none" style={{ fontSize: 8, color: accentDim }}>
              {operation}
            </p>
            <p
              className="font-black tracking-[0.12em] mt-0.5"
              style={{ color: "#ddd5c8", fontFamily: "Georgia, serif", fontSize: 14 }}
            >
              {title}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px" style={{ background: `${accent}25` }} />

        {/* Description */}
        <p className="text-xs leading-relaxed flex-1" style={{ color: "#5a3535" }}>
          {description}
        </p>

        {/* Optional slot (e.g., input for join) */}
        {children}

        {/* CTA */}
        <button
          onClick={onClick}
          disabled={disabled}
          className="w-full py-2.5 font-black tracking-[0.2em] uppercase text-xs rounded transition-all hover:brightness-110 disabled:opacity-40 active:scale-95"
          style={{
            background: `${accent}18`,
            border: `1px solid ${accent}60`,
            color: accent,
          }}
        >
          {btnLabel}
        </button>
      </div>

      {/* Accent bottom line */}
      <div className="h-[1px]" style={{ background: `linear-gradient(to right, transparent, ${accent}50, transparent)` }} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const me: Player = {
    uid: user!.uid,
    displayName: user!.displayName ?? "Anonymous",
    photoURL: user!.photoURL ?? "",
    isAlive: true,
    isReady: false,
  };

  async function handleCreate() {
    setError(""); setLoading(true);
    try { const id = await createGame(me); navigate(`/lobby/${id}`); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to create game."); }
    finally { setLoading(false); }
  }

  async function handleJoin() {
    setError("");
    if (!roomCode.trim()) { setError("Enter a room code."); return; }
    setLoading(true);
    try { await joinGame(roomCode.trim(), me); navigate(`/lobby/${roomCode.trim()}`); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to join game."); }
    finally { setLoading(false); }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse 90% 55% at 50% -5%, #2a0404 0%, #0e0000 45%, #000 100%)",
      }}
    >
      {/* ── Nav ── */}
      <nav
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: "1px solid #1e0505" }}
      >
        {/* Wordmark */}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#1a0202", border: "1px solid #4a0808" }}>
            <Shield size={11} style={{ color: "#7a0a0a" }} strokeWidth={1.5} />
          </div>
          <span className="font-black tracking-[0.25em] text-xs" style={{ color: "#4a0808" }}>
            SECRET HITLER
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-5">
          <span className="text-xs" style={{ color: "#3a1515" }}>{user?.displayName}</span>
          <button
            onClick={() => navigate("/leaderboard")}
            className="text-xs flex items-center gap-1 transition hover:opacity-80"
            style={{ color: "#5a3535" }}
          >
            <Trophy size={11} /> Leaderboard
          </button>
          <button
            onClick={logout}
            className="text-xs flex items-center gap-1 transition hover:opacity-80"
            style={{ color: "#5a2a2a" }}
          >
            <LogOut size={11} /> Sign Out
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-12">

        {/* Emblem + title block */}
        <div className="text-center space-y-5 select-none">

          {/* Geheimakte label */}
          <p
            className="tracking-[0.55em] font-black text-center"
            style={{ fontSize: 9, color: "#400808" }}
          >
            ✦ &nbsp;GEHEIMAKTE&nbsp; ✦ &nbsp;CLASSIFIED&nbsp; ✦ &nbsp;GEHEIMAKTE&nbsp; ✦
          </p>

          {/* Crest */}
          <Crest />

          {/* "SECRET" */}
          <h1
            className="font-black tracking-[0.12em] leading-none"
            style={{
              fontSize: "clamp(56px, 10vw, 100px)",
              color: "#c00000",
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow:
                "0 0 80px rgba(160,0,0,0.45), 0 0 30px rgba(180,0,0,0.25), 0 4px 16px rgba(0,0,0,0.9)",
            }}
          >
            SECRET
          </h1>

          {/* Diamond rule */}
          <div className="flex items-center gap-3 px-6">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, #5a0808)" }} />
            <div className="w-2 h-2 rotate-45" style={{ background: "#7a0000" }} />
            <div className="w-1 h-1 rotate-45 -mx-0.5" style={{ background: "#4a0000" }} />
            <div className="w-2 h-2 rotate-45" style={{ background: "#7a0000" }} />
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, #5a0808)" }} />
          </div>

          {/* "HITLER" */}
          <h1
            className="font-black tracking-[0.12em] leading-none"
            style={{
              fontSize: "clamp(56px, 10vw, 100px)",
              color: "#ddd5c5",
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 4px 24px rgba(0,0,0,0.95)",
            }}
          >
            HITLER
          </h1>

          {/* Tagline */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center gap-3 justify-center">
              <div className="w-8 h-px" style={{ background: "#2a0808" }} />
              <p className="tracking-[0.25em] text-xs font-semibold" style={{ color: "#3a1515" }}>
                SOCIAL DEDUCTION
              </p>
              <div className="w-8 h-px" style={{ background: "#2a0808" }} />
            </div>
            <p className="tracking-[0.18em] font-semibold" style={{ fontSize: 10, color: "#2a1010" }}>
              FOR 5 TO 10 PLAYERS
            </p>
          </div>
        </div>

        {/* ── Dossier cards ── */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-3xl">

          {/* Create */}
          <DossierCard
            fileNo="FILE · OP-001"
            icon={<Building2 size={20} />}
            operation="ESTABLISH OPERATION"
            title="Create Room"
            description="Open a new lobby. Share the access code with your operatives and start when ready."
            accent="#9b2020"
            accentDim="#4a1515"
            btnLabel={loading ? "Creating…" : "Create Room"}
            onClick={handleCreate}
            disabled={loading}
          />

          {/* Join */}
          <DossierCard
            fileNo="FILE · OP-002"
            icon={<DoorOpen size={20} />}
            operation="REQUEST ACCESS"
            title="Join Room"
            description="Enter the room code provided by your operative to infiltrate an existing operation."
            accent="#1a5a8a"
            accentDim="#1a3a5a"
            btnLabel={loading ? "Joining…" : "Enter Room"}
            onClick={handleJoin}
            disabled={loading}
          >
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="Room code"
              className="w-full rounded px-3 py-2.5 text-sm placeholder-[#2a1a1a] focus:outline-none"
              style={{
                background: "#080202",
                border: "1px solid #1a3a5a",
                color: "#9ab8d0",
              }}
            />
          </DossierCard>

          {/* Solo */}
          <DossierCard
            fileNo="FILE · OP-003"
            icon={<Bot size={20} />}
            operation="INTELLIGENCE SIM"
            title="Solo vs Bots"
            description="Run a classified simulation. Practice your deception and deduction against AI operatives."
            accent="#6a2a8a"
            accentDim="#3a1a5a"
            btnLabel="Play Solo"
            onClick={() => navigate("/solo")}
          />

        </div>

        {/* Error */}
        {error && (
          <p className="text-xs font-mono" style={{ color: "#cc3333" }}>
            [ERROR] {error}
          </p>
        )}

        {/* Bottom classified stamp */}
        <p
          className="tracking-[0.5em] font-black"
          style={{ fontSize: 8, color: "#1a0505" }}
        >
          ✦ &nbsp;TOP SECRET&nbsp; ✦ &nbsp;EYES ONLY&nbsp; ✦ &nbsp;TOP SECRET&nbsp; ✦
        </p>
      </div>
    </div>
  );
}
