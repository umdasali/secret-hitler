import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { startGame, leaveLobby } from "../lib/gameActions";
import type { Game } from "../types/game";

function RuleDivider() {
  return (
    <div className="flex items-center gap-3 w-full my-1">
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, #6b4e22)" }} />
      <div style={{ width: 5, height: 5, background: "#c9a84c", transform: "rotate(45deg)", flexShrink: 0 }} />
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, #6b4e22)" }} />
    </div>
  );
}

function CornerBrackets({ color = "#6b4e22", size = 10 }: { color?: string; size?: number }) {
  const b = 2;
  const corner = (top: boolean, left: boolean) => ({
    position: "absolute" as const,
    top: top ? 0 : undefined,
    bottom: top ? undefined : 0,
    left: left ? 0 : undefined,
    right: left ? undefined : 0,
    width: size,
    height: size,
    borderTop:    top  ? `${b}px solid ${color}` : "none",
    borderBottom: !top ? `${b}px solid ${color}` : "none",
    borderLeft:   left ? `${b}px solid ${color}` : "none",
    borderRight:  !left ? `${b}px solid ${color}` : "none",
  });
  return (
    <>
      <div style={corner(true, true)} />
      <div style={corner(true, false)} />
      <div style={corner(false, true)} />
      <div style={corner(false, false)} />
    </>
  );
}

export default function LobbyPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, "games", gameId), (snap) => {
      if (!snap.exists()) { navigate("/"); return; }
      const g = snap.data() as Game;
      setGame(g);
      if (g.status === "in_progress") navigate(`/game/${gameId}`);
    });
    return unsub;
  }, [gameId, navigate]);

  async function handleExit() {
    if (!gameId || !user) return;
    await leaveLobby(gameId, user.uid);
    navigate("/");
  }

  async function handleStart() {
    if (!gameId) return;
    setError("");
    setStarting(true);
    try {
      await startGame(gameId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start.");
      setStarting(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(gameId ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!game) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "radial-gradient(ellipse at top, #1c1208 0%, #0a0804 100%)" }}
      >
        <p style={{ color: "#6b4e22", fontFamily: "Georgia, serif", letterSpacing: "0.15em", fontSize: 13 }}>
          RETRIEVING ORDERS…
        </p>
      </div>
    );
  }

  const isHost = user?.uid === game.hostUid;
  const playerCount = game.players.length;
  const canStart = isHost && playerCount >= 5;
  const needed = Math.max(0, 5 - playerCount);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "radial-gradient(ellipse at top, #1c1208 0%, #0a0804 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* ── Exit confirmation modal ────────────────────────────────────── */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div
            className="relative w-full max-w-sm p-5 space-y-4"
            style={{ background: "#130f07", border: "1px solid #6b4e22", borderRadius: 4 }}
          >
            <CornerBrackets color="#c9a84c" size={10} />
            <h2 className="font-black tracking-[0.08em] uppercase" style={{ color: "#d4c8a0", fontFamily: "Georgia, serif", fontSize: 15 }}>
              Abort Mission?
            </h2>
            <p style={{ color: "#7a6a4a", fontFamily: "Georgia, serif", fontSize: 13, lineHeight: 1.6 }}>
              {game.hostUid === user?.uid
                ? "You are the commanding officer. Leaving will transfer command to the next agent."
                : "You will be removed from the staging area."}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 font-black tracking-wider py-2.5 text-xs transition-all hover:opacity-80"
                style={{ background: "#1e180a", border: "1px solid #4a3820", color: "#7a6a4a", fontFamily: "Georgia, serif", borderRadius: 3 }}
              >
                STAND DOWN
              </button>
              <button
                onClick={handleExit}
                className="flex-1 font-black tracking-wider py-2.5 text-xs transition-all hover:opacity-80"
                style={{ background: "#3a0a0a", border: "1px solid #8b1a1a", color: "#e05050", fontFamily: "Georgia, serif", borderRadius: 3 }}
              >
                ABORT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Nav bar ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: "#3a2a14", background: "#0e0b05ee" }}
      >
        <button
          onClick={() => setShowExitConfirm(true)}
          className="flex items-center gap-1 text-sm transition-all hover:opacity-80 flex-shrink-0"
          style={{ color: "#c9a84c", fontFamily: "Georgia, serif", letterSpacing: "0.04em" }}
        >
          ← <span className="hidden xs:inline">RETREAT</span><span className="xs:hidden">BACK</span>
        </button>
        <div className="flex-1 h-px" style={{ background: "#3a2a14" }} />
        <span
          className="text-xs tracking-[0.15em] sm:tracking-[0.25em] uppercase flex-shrink-0"
          style={{ color: "#6b4e22", fontFamily: "Georgia, serif" }}
        >
          STAGING AREA
        </span>
      </div>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center px-3 sm:px-4 py-5 sm:py-8 gap-4 sm:gap-6 overflow-x-hidden">

        {/* Masthead */}
        <div className="text-center w-full max-w-md">
          <div
            className="inline-block border px-3 py-0.5 mb-2 text-xs"
            style={{
              borderColor: "#8b1a1a",
              color: "#8b1a1a",
              fontFamily: "Georgia, serif",
              letterSpacing: "0.25em",
              transform: "rotate(-1.2deg)",
            }}
          >
            CLASSIFIED
          </div>
          <h1
            className="font-black uppercase leading-tight block"
            style={{
              fontSize: "clamp(18px, 5.5vw, 36px)",
              color: "#d4c8a0",
              fontFamily: "Georgia, serif",
              letterSpacing: "clamp(0.06em, 2vw, 0.18em)",
              textShadow: "0 2px 12px #00000080",
            }}
          >
            PRE-MISSION BRIEFING
          </h1>
          <RuleDivider />
          <p
            className="text-xs mt-1"
            style={{ color: "#7a6a4a", fontFamily: "Georgia, serif", letterSpacing: "0.1em" }}
          >
            AWAIT ORDERS FROM COMMANDING OFFICER
          </p>
        </div>

        {/* Mission code */}
        <div
          className="relative w-full max-w-md p-4 sm:p-5"
          style={{ border: "1px solid #4a3820", borderRadius: 4 }}
        >
          <CornerBrackets color="#6b4e22" size={9} />
          <p
            className="text-xs uppercase mb-2"
            style={{ color: "#6b4e22", fontFamily: "Georgia, serif", letterSpacing: "0.2em" }}
          >
            Mission Code
          </p>
          <div className="flex items-center gap-2">
            <span
              className="flex-1 text-center py-2.5 font-black overflow-hidden"
              style={{
                background: "#0e0b05",
                border: "1px solid #8b1a1a",
                color: "#e8d4a0",
                fontFamily: "Georgia, serif",
                borderRadius: 3,
                fontSize: "clamp(13px, 3.5vw, 20px)",
                letterSpacing: "clamp(0.08em, 1.5vw, 0.3em)",
                wordBreak: "break-all",
              }}
            >
              {gameId}
            </span>
            <button
              onClick={handleCopy}
              className="font-black text-xs transition-all hover:opacity-80 flex-shrink-0"
              style={{
                background: copied ? "#1a3a1a" : "#1e180a",
                border: `1px solid ${copied ? "#3a8a3a" : "#6b4e22"}`,
                color: copied ? "#6aaa6a" : "#c9a84c",
                fontFamily: "Georgia, serif",
                borderRadius: 3,
                padding: "10px 14px",
                letterSpacing: "0.1em",
              }}
            >
              {copied ? "✓" : "COPY"}
            </button>
          </div>
          <p
            className="text-xs mt-2"
            style={{ color: "#4a3820", fontFamily: "Georgia, serif", letterSpacing: "0.06em" }}
          >
            Transmit this code to your operatives
          </p>
        </div>

        {/* Agents roster */}
        <div
          className="relative w-full max-w-md p-4 sm:p-5 space-y-2 sm:space-y-3"
          style={{ border: "1px solid #3a2a14", borderRadius: 4 }}
        >
          <CornerBrackets color="#4a3820" size={9} />

          <div className="flex items-center justify-between">
            <p
              className="text-xs uppercase"
              style={{ color: "#6b4e22", fontFamily: "Georgia, serif", letterSpacing: "0.18em" }}
            >
              Agents Assembled
            </p>
            <span
              className="text-xs font-black"
              style={{ color: playerCount >= 5 ? "#c9a84c" : "#6b4e22", fontFamily: "Georgia, serif" }}
            >
              {playerCount} / 10
            </span>
          </div>

          <RuleDivider />

          <div className="space-y-1.5">
            {game.players.map((uid, idx) => {
              const p = game.playerMap[uid];
              const isThisHost = uid === game.hostUid;
              const isMe = uid === user?.uid;

              return (
                <div
                  key={uid}
                  className="relative flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2"
                  style={{
                    background: isMe ? "#1e180a" : "transparent",
                    border: `1px solid ${isMe ? "#6b4e22" : "#2e2010"}`,
                    borderRadius: 3,
                  }}
                >
                  {/* Number */}
                  <span
                    className="font-black w-5 text-right flex-shrink-0"
                    style={{ color: "#4a3820", fontFamily: "Georgia, serif", fontSize: 11 }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>

                  {/* Avatar */}
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 flex items-center justify-center text-xs font-black overflow-hidden"
                    style={{
                      border: `1px solid ${isThisHost ? "#c9a84c" : "#4a3820"}`,
                      background: "#0e0b05",
                      color: "#c9a84c",
                      fontFamily: "Georgia, serif",
                      filter: "sepia(0.3)",
                    }}
                  >
                    {p?.photoURL ? (
                      <img src={p.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      p?.displayName?.[0]?.toUpperCase() ?? "?"
                    )}
                  </div>

                  {/* Name */}
                  <span
                    className="flex-1 font-black truncate min-w-0"
                    style={{
                      color: isMe ? "#e8d8a8" : "#b8a878",
                      fontFamily: "Georgia, serif",
                      letterSpacing: "0.04em",
                      fontSize: "clamp(11px, 3vw, 14px)",
                    }}
                  >
                    {p?.displayName?.toUpperCase() ?? uid}
                  </span>

                  {/* Badges */}
                  <div className="flex gap-1 flex-shrink-0">
                    {isThisHost && (
                      <span
                        className="text-[9px] font-black tracking-wider px-1.5 py-0.5"
                        style={{
                          color: "#c9a84c",
                          background: "#1e180a",
                          border: "1px solid #6b4e22",
                          borderRadius: 2,
                          fontFamily: "Georgia, serif",
                        }}
                      >
                        C.O.
                      </span>
                    )}
                    {isMe && (
                      <span
                        className="text-[9px] font-black tracking-wider px-1.5 py-0.5"
                        style={{
                          color: "#4a80b0",
                          background: "#0a1020",
                          border: "1px solid #2a5080",
                          borderRadius: 2,
                          fontFamily: "Georgia, serif",
                        }}
                      >
                        YOU
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {needed > 0 && (
            <p
              className="text-center text-xs pt-1"
              style={{ color: "#4a3820", fontFamily: "Georgia, serif", letterSpacing: "0.08em" }}
            >
              {needed} MORE OPERATIVE{needed !== 1 ? "S" : ""} NEEDED
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p
            className="text-xs text-center"
            style={{ color: "#e05050", fontFamily: "Georgia, serif", letterSpacing: "0.08em" }}
          >
            {error}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-3 w-full max-w-md pb-4">
          {isHost ? (
            <button
              onClick={handleStart}
              disabled={!canStart || starting}
              className="w-full py-4 font-black uppercase transition-all hover:opacity-90 disabled:opacity-30"
              style={{
                background: canStart && !starting ? "#3a0a0a" : "#1a1208",
                border: `1px solid ${canStart && !starting ? "#c94228" : "#4a3820"}`,
                color: canStart && !starting ? "#e8c0b0" : "#4a3820",
                fontFamily: "Georgia, serif",
                borderRadius: 3,
                fontSize: "clamp(11px, 2.8vw, 14px)",
                letterSpacing: "clamp(0.08em, 1.5vw, 0.18em)",
                boxShadow: canStart && !starting ? "0 0 20px #c9422820" : "none",
              }}
            >
              {starting ? "MOBILISING FORCES…" : "COMMENCE OPERATION"}
            </button>
          ) : (
            <div
              className="w-full py-3 text-center text-xs"
              style={{
                color: "#4a3820",
                fontFamily: "Georgia, serif",
                letterSpacing: "0.1em",
                border: "1px dashed #2e2010",
                borderRadius: 3,
              }}
            >
              AWAITING C.O.'S ORDER…
            </div>
          )}

          <button
            onClick={() => setShowExitConfirm(true)}
            className="w-full py-3 font-black uppercase text-xs transition-all hover:opacity-80"
            style={{
              background: "transparent",
              border: "1px solid #2e2010",
              color: "#4a3820",
              fontFamily: "Georgia, serif",
              borderRadius: 3,
              letterSpacing: "0.12em",
            }}
          >
            ABORT MISSION
          </button>
        </div>

        <p
          className="text-xs pb-2"
          style={{ color: "#2e2010", fontFamily: "Georgia, serif", letterSpacing: "0.08em" }}
        >
          OPERATION: SECRET HITLER — EYES ONLY
        </p>
      </div>
    </div>
  );
}
