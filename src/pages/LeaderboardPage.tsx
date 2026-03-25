import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Trophy, Medal, Shield, Zap, Eye, ArrowLeft } from "lucide-react";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import type { LeaderboardEntry } from "../types/game";

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
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="text-gray-400 hover:text-white transition flex items-center gap-1 text-sm"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-2xl font-bold text-yellow-500">Leaderboard</h1>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center text-gray-500 py-20">Loading leaderboard…</div>
        ) : entries.length === 0 ? (
          <div className="text-center text-gray-600 py-20">No games played yet.</div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, idx) => {
              const winRate =
                entry.gamesPlayed > 0
                  ? Math.round((entry.wins / entry.gamesPlayed) * 100)
                  : 0;
              const rankIcon =
                idx === 0 ? <Trophy size={20} className="text-yellow-400" /> :
                idx === 1 ? <Medal size={20} className="text-gray-300" /> :
                idx === 2 ? <Medal size={20} className="text-amber-600" /> :
                <span className="text-sm text-gray-500">#{idx + 1}</span>;

              return (
                <div
                  key={entry.uid}
                  className={`flex items-center gap-4 bg-gray-900 border rounded-2xl px-5 py-4 ${
                    idx < 3 ? "border-yellow-800" : "border-gray-800"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-10 flex justify-center items-center">
                    {rankIcon}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold">
                    {entry.photoURL ? (
                      <img src={entry.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      entry.displayName[0]?.toUpperCase()
                    )}
                  </div>

                  {/* Name + role wins */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{entry.displayName}</p>
                    <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1"><Shield size={11} className="text-blue-400" />{entry.winsByRole.liberal}</span>
                      <span className="flex items-center gap-1"><Zap size={11} className="text-red-400" />{entry.winsByRole.fascist}</span>
                      <span className="flex items-center gap-1"><Eye size={11} className="text-gray-400" />{entry.winsByRole.hitler}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right space-y-0.5">
                    <p className="text-white font-bold text-lg">{entry.wins}</p>
                    <p className="text-gray-600 text-xs">{entry.gamesPlayed} games</p>
                    <p className="text-yellow-600 text-xs font-semibold">{winRate}% win rate</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
