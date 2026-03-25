import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { startGame } from "../lib/gameActions";
import type { Game } from "../types/game";

export default function LobbyPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, "games", gameId), (snap) => {
      if (!snap.exists()) { navigate("/"); return; }
      const g = snap.data() as Game;
      setGame(g);
      if (g.status === "in_progress") {
        navigate(`/game/${gameId}`);
      }
    });
    return unsub;
  }, [gameId, navigate]);

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

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading lobby…</p>
      </div>
    );
  }

  const isHost = user?.uid === game.hostUid;
  const playerCount = game.players.length;
  const canStart = isHost && playerCount >= 5;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-10 space-y-8">
      <div className="text-center space-y-1">
        <h1 className="text-4xl font-bold text-red-500">Game Lobby</h1>
        <p className="text-gray-400 text-sm">Share this code with your friends</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="font-mono text-xl bg-gray-800 px-4 py-2 rounded-lg text-white tracking-widest">
            {gameId}
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(gameId ?? "")}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded-lg transition"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Players */}
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-white">Players</h2>
          <span className="text-sm text-gray-500">{playerCount} / 10</span>
        </div>
        {game.players.map((uid) => {
          const p = game.playerMap[uid];
          return (
            <div
              key={uid}
              className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3"
            >
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                {p?.photoURL ? (
                  <img src={p.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  p?.displayName?.[0]?.toUpperCase() ?? "?"
                )}
              </div>
              <span className="text-gray-200 text-sm flex-1">{p?.displayName ?? uid}</span>
              {uid === game.hostUid && (
                <span className="text-xs text-yellow-500 font-semibold">HOST</span>
              )}
              {uid === user?.uid && (
                <span className="text-xs text-blue-400 font-semibold">YOU</span>
              )}
            </div>
          );
        })}

        {playerCount < 5 && (
          <p className="text-center text-gray-600 text-xs pt-2">
            Need at least 5 players to start ({5 - playerCount} more needed)
          </p>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {isHost ? (
        <button
          onClick={handleStart}
          disabled={!canStart || starting}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold rounded-xl px-10 py-4 text-lg transition"
        >
          {starting ? "Starting…" : "Start Game"}
        </button>
      ) : (
        <p className="text-gray-500 text-sm">Waiting for the host to start…</p>
      )}
    </div>
  );
}
