import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, User, Shield, Zap, Eye, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createSoloGame } from "../lib/gameActions";
import type { Player } from "../types/game";

const BOT_NAMES = ["Klaus", "Greta", "Hans", "Elsa", "Fritz", "Liesel", "Otto", "Werner", "Brunhilde"];

export default function SoloSetupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [totalPlayers, setTotalPlayers] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const botCount = totalPlayers - 1;

  async function handleStart() {
    if (!user) return;
    setError("");
    setLoading(true);
    const me: Player = {
      uid: user.uid,
      displayName: user.displayName ?? "You",
      photoURL: user.photoURL ?? "",
      isAlive: true,
      isReady: true,
    };
    try {
      const gameId = await createSoloGame(me, totalPlayers);
      navigate(`/game/${gameId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start game.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center gap-4 px-6 py-4 bg-gray-900 border-b border-gray-800">
        <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white transition flex items-center gap-1 text-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-bold text-red-500">Solo vs Bots</h1>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 space-y-10">
        <div className="text-center space-y-2">
          <Bot size={56} className="mx-auto text-purple-400" />
          <h2 className="text-3xl font-black text-white">Play Against Bots</h2>
          <p className="text-gray-400">
            You'll be assigned a random role. Bots make real decisions based on their team.
          </p>
        </div>

        {/* Player count picker */}
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-gray-300 font-semibold">Total Players</label>
              <span className="text-white font-black text-2xl">{totalPlayers}</span>
            </div>
            <input
              type="range"
              min={5}
              max={10}
              value={totalPlayers}
              onChange={(e) => setTotalPlayers(Number(e.target.value))}
              className="w-full accent-red-500"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>5 (min)</span>
              <span>10 (max)</span>
            </div>
          </div>

          {/* Bots preview */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">
              You + {botCount} bot{botCount !== 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {/* Human */}
              <span className="flex items-center gap-1 bg-blue-900/50 border border-blue-700 text-blue-300 text-xs px-3 py-1.5 rounded-full font-semibold">
                <User size={12} /> {user?.displayName?.split(" ")[0] ?? "You"}
              </span>
              {/* Bots */}
              {Array.from({ length: botCount }, (_, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 bg-gray-800 border border-gray-700 text-gray-400 text-xs px-3 py-1.5 rounded-full"
                >
                  <Bot size={12} /> {BOT_NAMES[i % BOT_NAMES.length]}
                </span>
              ))}
            </div>
          </div>

          {/* Role distribution info */}
          <RoleDistribution totalPlayers={totalPlayers} />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl py-4 text-lg transition"
          >
            {loading ? "Starting…" : "Start Game"}
          </button>
        </div>

        {/* Bot strategy hint */}
        <div className="w-full max-w-md bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-2">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">How bots play</p>
          <ul className="text-sm text-gray-400 space-y-1">
            <li className="flex items-center gap-2"><Shield size={14} className="text-blue-400 shrink-0" /><span className="text-blue-400">Liberal bots</span> — vote to block fascist governments, discard fascist policies</li>
            <li className="flex items-center gap-2"><Zap size={14} className="text-red-400 shrink-0" /><span className="text-red-400">Fascist bots</span> — protect Hitler, pass fascist policies when possible</li>
            <li className="flex items-center gap-2"><Eye size={14} className="text-gray-400 shrink-0" /><span className="text-gray-300">Hitler bot</span> — acts like a Liberal, waits to be elected Chancellor</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function RoleDistribution({ totalPlayers }: { totalPlayers: number }) {
  const map: Record<number, { liberals: number; fascists: number }> = {
    5:  { liberals: 3, fascists: 1 },
    6:  { liberals: 4, fascists: 1 },
    7:  { liberals: 4, fascists: 2 },
    8:  { liberals: 5, fascists: 2 },
    9:  { liberals: 5, fascists: 3 },
    10: { liberals: 6, fascists: 3 },
  };
  const { liberals, fascists } = map[totalPlayers];
  return (
    <div className="flex gap-3 text-xs">
      <div className="flex-1 bg-blue-900/30 border border-blue-800 rounded-lg p-2 text-center">
        <div className="text-blue-300 font-bold text-lg">{liberals}</div>
        <div className="text-blue-500">Liberals</div>
      </div>
      <div className="flex-1 bg-red-900/30 border border-red-800 rounded-lg p-2 text-center">
        <div className="text-red-300 font-bold text-lg">{fascists}</div>
        <div className="text-red-500">Fascists</div>
      </div>
      <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-center">
        <div className="text-gray-300 font-bold text-lg">1</div>
        <div className="text-gray-500">Hitler</div>
      </div>
    </div>
  );
}
