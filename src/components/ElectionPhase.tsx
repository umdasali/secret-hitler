import { Bot } from "lucide-react";
import type { Game } from "../types/game";
import { nominateChancellor, castVote } from "../lib/gameActions";

interface ElectionPhaseProps {
  game: Game;
  myUid: string;
  gameId: string;
}

export default function ElectionPhase({ game, myUid, gameId }: ElectionPhaseProps) {
  const presidentUid = game.players[game.presidentIndex];
  const isPresident = myUid === presidentUid;
  const hasVoted = myUid in game.votes;
  const alivePlayers = game.players.filter((uid) => game.playerMap[uid]?.isAlive);

  const ineligible = new Set<string>([presidentUid]);
  if (game.lastChancellorUid) ineligible.add(game.lastChancellorUid);
  if (game.players.length > 5 && game.lastPresidentUid) {
    ineligible.add(game.lastPresidentUid);
  }
  // If term limits leave no candidates (edge case: ≤2 alive), relax them
  const eligibleChancellors = alivePlayers.filter((uid) => !ineligible.has(uid));
  const finalEligible = eligibleChancellors.length > 0
    ? eligibleChancellors
    : alivePlayers.filter((uid) => uid !== presidentUid);

  async function handleNominate(uid: string) {
    await nominateChancellor(gameId, uid);
  }

  async function handleVote(vote: boolean) {
    await castVote(gameId, myUid, vote);
  }

  // ── Voting phase ────────────────────────────────────────────────────────────
  if (game.votingOpen) {
    const jaVoters  = alivePlayers.filter((uid) => uid in game.votes &&  game.votes[uid]);
    const neinVoters = alivePlayers.filter((uid) => uid in game.votes && !game.votes[uid]);
    const pending    = alivePlayers.filter((uid) => !(uid in game.votes));

    return (
      <div className="space-y-5 text-center">
        {/* Government proposal */}
        <div>
          <h2 className="text-2xl font-bold text-white">Vote!</h2>
          <p className="text-gray-400 text-sm mt-1">
            <span className="text-yellow-400 font-semibold">
              {game.playerMap[presidentUid]?.displayName}
            </span>{" "}
            (P) +{" "}
            <span className="text-yellow-400 font-semibold">
              {game.playerMap[game.nominatedChancellor!]?.displayName}
            </span>{" "}
            (C)
          </p>
        </div>

        {/* Human vote buttons */}
        {!hasVoted ? (
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => handleVote(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl px-10 py-5 text-2xl transition shadow-lg shadow-green-900/40"
            >
              Ja! ✓
            </button>
            <button
              onClick={() => handleVote(false)}
              className="bg-red-700 hover:bg-red-800 text-white font-black rounded-2xl px-10 py-5 text-2xl transition shadow-lg shadow-red-900/40"
            >
              Nein ✗
            </button>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">
            Vote cast — waiting for others ({Object.keys(game.votes).length} / {alivePlayers.length})
          </p>
        )}

        {/* Live tally */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          {/* Ja column */}
          <div className="bg-green-950/60 border border-green-800 rounded-xl p-3 space-y-2">
            <div className="font-black text-green-400 text-lg">
              Ja ✓ <span className="text-green-300">{jaVoters.length}</span>
            </div>
            {jaVoters.map((uid) => (
              <PlayerBadge
                key={uid}
                name={game.playerMap[uid]?.displayName ?? uid}
                isBot={game.botUids?.includes(uid)}
                color="green"
              />
            ))}
          </div>

          {/* Pending column */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 space-y-2">
            <div className="font-bold text-gray-500 text-sm">
              Waiting {pending.length}
            </div>
            {pending.map((uid) => (
              <PlayerBadge
                key={uid}
                name={game.playerMap[uid]?.displayName ?? uid}
                isBot={game.botUids?.includes(uid)}
                color="gray"
              />
            ))}
          </div>

          {/* Nein column */}
          <div className="bg-red-950/60 border border-red-900 rounded-xl p-3 space-y-2">
            <div className="font-black text-red-400 text-lg">
              Nein ✗ <span className="text-red-300">{neinVoters.length}</span>
            </div>
            {neinVoters.map((uid) => (
              <PlayerBadge
                key={uid}
                name={game.playerMap[uid]?.displayName ?? uid}
                isBot={game.botUids?.includes(uid)}
                color="red"
              />
            ))}
          </div>
        </div>

        <p className="text-gray-600 text-xs">
          Election tracker: {game.electionTracker}/3 - majority needed to form government
        </p>
      </div>
    );
  }

  // ── Nomination phase ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Election</h2>
        <p className="text-gray-400 text-sm mt-1">
          <span className="text-yellow-400 font-semibold">
            {game.playerMap[presidentUid]?.displayName}
          </span>{" "}
          is nominating a Chancellor
        </p>
        <p className="text-gray-600 text-xs mt-1">
          Election tracker: {game.electionTracker}/3
        </p>
      </div>

      {isPresident ? (
        <div className="space-y-3">
          <p className="text-center text-gray-300 text-sm font-semibold">
            You are President — choose your Chancellor:
          </p>
          {finalEligible.map((uid) => (
              <button
                key={uid}
                onClick={() => handleNominate(uid)}
                className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-3 transition text-left"
              >
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                  {game.playerMap[uid]?.photoURL ? (
                    <img src={game.playerMap[uid].photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    game.playerMap[uid]?.displayName?.[0]?.toUpperCase()
                  )}
                </div>
                <span className="text-gray-200">{game.playerMap[uid]?.displayName}</span>
                {game.botUids?.includes(uid) && (
                  <Bot size={14} className="text-gray-600 ml-auto" />
                )}
              </button>
            ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 text-sm">
          Waiting for{" "}
          <span className="text-white font-semibold">
            {game.playerMap[presidentUid]?.displayName}
          </span>{" "}
          to nominate a Chancellor…
        </p>
      )}
    </div>
  );
}

// ── Small badge component ──────────────────────────────────────────────────────

function PlayerBadge({
  name,
  isBot,
  color,
}: {
  name: string;
  isBot?: boolean;
  color: "green" | "red" | "gray";
}) {
  const styles = {
    green: "bg-green-900/50 text-green-300",
    red:   "bg-red-900/50 text-red-300",
    gray:  "bg-gray-800 text-gray-500",
  };
  return (
    <div className={`text-xs px-2 py-1 rounded-lg truncate flex items-center gap-1 ${styles[color]}`}>
      {isBot && <Bot size={10} />}{name}
    </div>
  );
}
