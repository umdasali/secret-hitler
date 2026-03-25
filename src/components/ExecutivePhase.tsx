import { useState } from "react";
import { Shield, Zap, Skull } from "lucide-react";
import type { Game, Policy } from "../types/game";
import { executePower, investigatePlayer, peekTopPolicies } from "../lib/gameActions";

interface ExecutivePhaseProps {
  game: Game;
  myUid: string;
  gameId: string;
}

export default function ExecutivePhase({ game, myUid, gameId }: ExecutivePhaseProps) {
  const actualPresident = game.lastPresidentUid ?? game.players[game.presidentIndex];
  const isPresident = myUid === actualPresident;
  const power = game.pendingPower;

  const [investigateResult, setInvestigateResult] = useState<{ name: string; party: "liberal" | "fascist" } | null>(null);
  const [peekResult, setPeekResult] = useState<Policy[] | null>(null);
  const [loading, setLoading] = useState(false);

  const alivePlayers = game.players.filter(
    (uid) => game.playerMap[uid]?.isAlive && uid !== actualPresident
  );

  async function handleInvestigate(targetUid: string) {
    setLoading(true);
    const party = await investigatePlayer(gameId, targetUid);
    setInvestigateResult({ name: game.playerMap[targetUid]?.displayName ?? targetUid, party: party as "liberal" | "fascist" });
    setLoading(false);
  }

  async function handlePeek() {
    setLoading(true);
    setPeekResult(peekTopPolicies(game));
    setLoading(false);
  }

  async function handleExecutePower(targetUid?: string) {
    if (!power) return;
    setLoading(true);
    await executePower(gameId, targetUid ?? "", power);
    setLoading(false);
  }

  const powerLabels: Record<string, string> = {
    investigate: "Investigate Loyalty",
    peek: "Policy Peek",
    special_election: "Special Election",
    execution: "Execution",
  };

  if (!isPresident) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Executive Action</h2>
        <p className="text-gray-400">
          <span className="text-yellow-400 font-semibold">
            {game.playerMap[actualPresident]?.displayName}
          </span>{" "}
          is using the{" "}
          <span className="text-red-400 font-semibold">
            {powerLabels[power ?? ""] ?? power}
          </span>{" "}
          power…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div>
        <h2 className="text-2xl font-bold text-white">Executive Action</h2>
        <p className="text-red-400 font-semibold text-lg mt-1">
          {powerLabels[power ?? ""] ?? power}
        </p>
      </div>

      {/* Investigate */}
      {power === "investigate" && !investigateResult && (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm">Choose a player to investigate their party loyalty:</p>
          {alivePlayers.map((uid) => (
            <button
              key={uid}
              onClick={() => handleInvestigate(uid)}
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-3 text-gray-200 transition disabled:opacity-50"
            >
              {game.playerMap[uid]?.displayName}
            </button>
          ))}
        </div>
      )}
      {investigateResult && (
        <div className="space-y-4">
          <div className={`rounded-xl p-4 font-semibold flex items-center justify-center gap-2 ${investigateResult.party === "liberal" ? "bg-blue-900/50 text-blue-200" : "bg-red-900/50 text-red-200"}`}>
            {investigateResult.party === "liberal"
              ? <Shield size={18} className="text-blue-400" />
              : <Zap size={18} className="text-red-400" />}
            {investigateResult.name} is a member of the{" "}
            {investigateResult.party === "liberal" ? "Liberal" : "Fascist"} party.
          </div>
          <button onClick={() => handleExecutePower()} className="bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-xl px-6 py-3 transition">
            Continue
          </button>
        </div>
      )}

      {/* Peek */}
      {power === "peek" && !peekResult && (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm">Peek at the top 3 policy tiles in the draw pile.</p>
          <button onClick={handlePeek} disabled={loading} className="bg-yellow-700 hover:bg-yellow-600 text-white font-semibold rounded-xl px-8 py-3 transition disabled:opacity-50">
            Peek
          </button>
        </div>
      )}
      {peekResult && (
        <div className="space-y-4">
          <div className="flex gap-3 justify-center">
            {peekResult.map((p, i) => (
              <div key={i} className={`border rounded-xl px-4 py-3 flex flex-col items-center gap-1 font-semibold text-sm ${p === "L" ? "bg-blue-900/40 border-blue-700 text-blue-200" : "bg-red-900/40 border-red-800 text-red-200"}`}>
                {p === "L" ? <Shield size={20} className="text-blue-400" /> : <Skull size={20} className="text-red-400" />}
                {p === "L" ? "Liberal" : "Fascist"}
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs">Only you can see this. Don't share unless you want to.</p>
          <button onClick={() => handleExecutePower()} className="bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-xl px-6 py-3 transition">
            Continue
          </button>
        </div>
      )}

      {/* Special Election */}
      {power === "special_election" && (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm">Choose any player to be the next Presidential Candidate:</p>
          {alivePlayers.map((uid) => (
            <button
              key={uid}
              onClick={() => handleExecutePower(uid)}
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-yellow-900/40 hover:border-yellow-700 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 transition disabled:opacity-50"
            >
              {game.playerMap[uid]?.displayName}
            </button>
          ))}
        </div>
      )}

      {/* Execution */}
      {power === "execution" && (
        <div className="space-y-3">
          <p className="text-red-400 text-sm font-semibold">Execute a player. Choose wisely — if you kill Hitler, Liberals win.</p>
          {alivePlayers.map((uid) => (
            <button
              key={uid}
              onClick={() => handleExecutePower(uid)}
              disabled={loading}
              className="w-full bg-red-950 hover:bg-red-900 border border-red-800 rounded-xl px-4 py-3 text-red-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Skull size={16} /> {game.playerMap[uid]?.displayName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
