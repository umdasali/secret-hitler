import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import {
  fetchMyRole,
  fetchAllRoles,
  recordMyResult,
  nominateChancellor,
  castVote,
  presidentDiscard,
  chancellorEnact,
  executePower,
  leaveGame,
} from "../lib/gameActions";
import type { Game, PrivateRole, Role } from "../types/game";
import {
  botDecideChancellor,
  botDecideVote,
  botPresidentDiscard,
  botChancellorEnact,
  botDecidePowerTarget,
  delay,
} from "../lib/botLogic";
import { Bot, Skull, CheckCircle2, XCircle, Shield, Zap, Crown, Landmark } from "lucide-react";
import PolicyBoard from "../components/PolicyBoard";
import RoleCard from "../components/RoleCard";
import ElectionPhase from "../components/ElectionPhase";
import LegislativePhase from "../components/LegislativePhase";
import ExecutivePhase from "../components/ExecutivePhase";

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [game, setGame] = useState<Game | null>(null);
  const [myRole, setMyRole] = useState<PrivateRole | null>(null);
  const [showRole, setShowRole] = useState(true);
  const [resultRecorded, setResultRecorded] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Vote result overlay — captured when voting closes so it stays visible 3s
  const [voteSnapshot, setVoteSnapshot] = useState<{
    votes: Record<string, boolean>;
    playerMap: Game["playerMap"];
    botUids: string[];
    presidentName: string;
    chancellorName: string;
    passed: boolean;
  } | null>(null);
  const prevVotingOpen = useRef<boolean | null>(null);
  const voteOverlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Captures the president/chancellor names when voting OPENS (so failed votes show correct names)
  const voteGovernmentRef = useRef({ presidentName: "?", chancellorName: "?" });

  // Bot driver state
  const [botRoles, setBotRoles] = useState<Record<string, Role>>({});
  const botRolesLoaded = useRef(false);
  const botProcessing = useRef(false);
  const lastBotStateKey = useRef("");

  // ── Realtime game listener ──────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId || !user) return;
    const unsub = onSnapshot(doc(db, "games", gameId), (snap) => {
      if (!snap.exists()) { navigate("/"); return; }
      setGame(snap.data() as Game);
    });
    return unsub;
  }, [gameId, user, navigate]);

  // ── Fetch own role ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId || !user) return;
    fetchMyRole(gameId, user.uid).then(setMyRole);
  }, [gameId, user]);

  // ── Record own result once when game ends ───────────────────────────────────
  useEffect(() => {
    if (!game || !user || !gameId) return;
    if (game.status !== "finished" || !game.winner || resultRecorded) return;
    setResultRecorded(true);
    recordMyResult(gameId, user.uid, game.winner);
  }, [game?.status, game?.winner, gameId, user, resultRecorded]);

  // ── If game resets to lobby (player left mid-game), redirect everyone ─────────
  useEffect(() => {
    if (game?.status === "lobby") {
      navigate(`/lobby/${gameId}`);
    }
  }, [game?.status, gameId, navigate]);

  async function handleExitGame() {
    if (!gameId || !user) return;
    await leaveGame(gameId, user.uid);
    navigate("/");
  }

  // ── Capture government names when voting OPENS (needed for failed-vote overlay) ──
  useEffect(() => {
    if (!game || !game.votingOpen || !game.nominatedChancellor) return;
    const pUid = game.players[game.presidentIndex];
    voteGovernmentRef.current = {
      presidentName:  game.playerMap[pUid]?.displayName ?? "?",
      chancellorName: game.playerMap[game.nominatedChancellor]?.displayName ?? "?",
    };
  }, [game?.votingOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Capture vote results the moment voting closes ───────────────────────────
  useEffect(() => {
    if (!game) return;
    const wasOpen = prevVotingOpen.current;
    const isOpen  = game.votingOpen;
    prevVotingOpen.current = isOpen;

    // Transition: open → closed — snapshot and show overlay
    if (wasOpen === true && isOpen === false && Object.keys(game.votes).length > 0) {
      const alivePlayers = game.players.filter((uid) => game.playerMap[uid]?.isAlive);
      const jaCount = Object.values(game.votes).filter(Boolean).length;
      const passed  = jaCount > alivePlayers.length / 2;

      setVoteSnapshot({
        votes:         { ...game.votes },
        playerMap:     { ...game.playerMap },
        botUids:       game.botUids ?? [],
        presidentName:  voteGovernmentRef.current.presidentName,
        chancellorName: voteGovernmentRef.current.chancellorName,
        passed,
      });

      // Auto-dismiss after 3 seconds
      if (voteOverlayTimer.current) clearTimeout(voteOverlayTimer.current);
      voteOverlayTimer.current = setTimeout(() => setVoteSnapshot(null), 3000);
    }
  }, [game?.votingOpen]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load bot roles (solo mode only, once) ───────────────────────────────────
  useEffect(() => {
    if (!game?.isSoloMode || !gameId || botRolesLoaded.current) return;
    if (game.status !== "in_progress") return;
    botRolesLoaded.current = true;
    fetchAllRoles(gameId, game.players).then((all) => {
      const roles: Record<string, Role> = {};
      for (const [uid, pr] of Object.entries(all)) {
        roles[uid] = pr.role;
      }
      setBotRoles(roles);
    });
  }, [game?.status, game?.isSoloMode, gameId, game?.players]);

  // ── Bot driver ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!game?.isSoloMode || !gameId) return;
    if (game.status !== "in_progress") return;
    if (Object.keys(botRoles).length === 0) return;

    // Build a key that changes whenever the game reaches a new bot-actionable state
    const presidentUid = game.players[game.presidentIndex];
    const stateKey = [
      game.phase,
      game.presidentIndex,
      game.votingOpen ? "voting" : "no-vote",
      Object.keys(game.votes).length,
      game.drawnPolicies ? "drawn" : "no-drawn",
      game.chancellorHand ? "hand" : "no-hand",
      game.pendingPower ?? "no-power",
      game.nominatedChancellor ?? "no-nom",
    ].join("|");

    if (lastBotStateKey.current === stateKey) return;
    if (botProcessing.current) return;

    lastBotStateKey.current = stateKey;
    botProcessing.current = true;

    const timer = setTimeout(async () => {
      try {
        await runBotTurn(game, gameId, botRoles, presidentUid);
      } catch {
        // Reset stateKey so the driver retries on the next state change
        lastBotStateKey.current = "";
      } finally {
        botProcessing.current = false;
      }
    }, 900 + Math.random() * 700); // 0.9–1.6s natural delay

    return () => {
      clearTimeout(timer);
      botProcessing.current = false;
    };
  }, [
    game?.phase,
    game?.presidentIndex,
    game?.votingOpen,
    game?.nominatedChancellor,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    Object.keys(game?.votes ?? {}).length,
    game?.drawnPolicies,
    game?.chancellorHand,
    game?.pendingPower,
    botRoles,
    gameId,
    game?.isSoloMode,
    game?.status,
  ]);

  if (!game || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading game…</p>
      </div>
    );
  }

  const me = game.playerMap[user.uid];
  const isAlive = me?.isAlive ?? false;
  const presidentUid = game.players[game.presidentIndex];
  const alivePlayers = game.players.filter((uid) => game.playerMap[uid]?.isAlive);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Exit confirmation modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Exit Game?</h2>
            <p className="text-gray-400 text-sm">
              Are you sure you want to exit the game?
              {game && game.players.filter((id) => game.playerMap[id]?.isAlive).length - 1 >= 5
                ? " The remaining players will be returned to the lobby to restart."
                : " There won't be enough players to continue — the game will end for everyone."}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl py-2.5 text-sm transition"
              >
                Cancel
            </button>
              <button
                onClick={handleExitGame}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl py-2.5 text-sm transition"
              >
                Exit Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role reveal modal */}
      {showRole && myRole && (
        <RoleCard
          roleData={myRole}
          players={game.players.map((uid) => ({
            uid,
            displayName: game.playerMap[uid]?.displayName ?? uid,
          }))}
          onClose={() => setShowRole(false)}
        />
      )}

      {/* Vote result overlay */}
      {voteSnapshot && (
        <VoteResultOverlay
          snapshot={voteSnapshot}
          onClose={() => {
            if (voteOverlayTimer.current) clearTimeout(voteOverlayTimer.current);
            setVoteSnapshot(null);
          }}
        />
      )}

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-red-500">Secret Hitler</h1>
          {game.isSoloMode && (
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">Solo</span>
          )}
          <span className="text-xs text-gray-600 font-mono">{gameId}</span>
        </div>
        <div className="flex items-center gap-3">
          {myRole && (
            <button
              onClick={() => setShowRole(true)}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1 rounded-lg transition"
            >
              My Role
            </button>
          )}
          <span className="text-xs text-gray-500">Round {game.round}</span>
          {game.phase !== "finished" && !game.isSoloMode && (
            <button
              onClick={() => setShowExitConfirm(true)}
              className="text-xs bg-red-950 hover:bg-red-900 text-red-400 hover:text-red-300 border border-red-800/50 px-3 py-1 rounded-lg transition"
            >
              Exit
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-0">
        {/* Sidebar — players */}
        <div className="lg:w-60 bg-gray-900 border-b lg:border-b-0 lg:border-r border-gray-800 p-3 flex flex-col gap-3">

          {/* ── Active Government ── */}
          <div>
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Government</p>
            <div className="space-y-1.5">
              {/* President */}
              <div className="flex items-center gap-2 bg-yellow-950/50 border border-yellow-700/50 rounded-xl px-3 py-2">
                <Crown size={13} className="text-yellow-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-yellow-500 uppercase tracking-widest leading-none mb-0.5">President</p>
                  <p className="text-yellow-100 text-sm font-semibold truncate">
                    {game.playerMap[presidentUid]?.displayName?.split(" ")[0] ?? "—"}
                    {presidentUid === user.uid && <span className="text-yellow-600 text-xs"> (you)</span>}
                  </p>
                </div>
              </div>

              {/* Chancellor */}
              {(() => {
                const cUid = game.phase !== "election" ? game.lastChancellorUid : game.nominatedChancellor;
                return cUid ? (
                  <div className="flex items-center gap-2 bg-blue-950/50 border border-blue-700/50 rounded-xl px-3 py-2">
                    <Landmark size={13} className="text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none mb-0.5">
                        {game.phase === "election" ? "Nominated" : "Chancellor"}
                      </p>
                      <p className="text-blue-100 text-sm font-semibold truncate">
                        {game.playerMap[cUid]?.displayName?.split(" ")[0] ?? "—"}
                        {cUid === user.uid && <span className="text-blue-600 text-xs"> (you)</span>}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 border border-dashed border-gray-700 rounded-xl px-3 py-2">
                    <Landmark size={13} className="text-gray-700 shrink-0" />
                    <p className="text-gray-600 text-xs">No chancellor yet</p>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="border-t border-gray-800" />

          {/* ── Player List ── */}
          <div className="flex-1 space-y-1">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Players</p>
            {game.players.map((uid) => {
              const p = game.playerMap[uid];
              const isP = uid === presidentUid;
              const isC = uid === (game.phase !== "election" ? game.lastChancellorUid : game.nominatedChancellor);
              const alive = p?.isAlive ?? false;
              const isBot = game.botUids?.includes(uid);
              const isMe = uid === user.uid;

              return (
                <div
                  key={uid}
                  className={`relative flex items-center gap-2 rounded-xl px-3 py-2 transition-all border ${
                    !alive
                      ? "opacity-35 border-transparent"
                      : isP
                      ? "bg-yellow-950/30 border-yellow-800/50"
                      : isC
                      ? "bg-blue-950/30 border-blue-800/50"
                      : isMe
                      ? "bg-gray-800 border-gray-700"
                      : "border-transparent"
                  }`}
                >
                  {/* Left role bar */}
                  {alive && (isP || isC) && (
                    <div
                      className={`absolute left-0 inset-y-2 w-[3px] rounded-full ${
                        isP ? "bg-yellow-500" : "bg-blue-500"
                      }`}
                    />
                  )}

                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white overflow-hidden ring-2 ${
                      isP ? "ring-yellow-500" : isC ? "ring-blue-500" : "ring-transparent"
                    }`}
                    style={{ background: alive ? "#4b5563" : "#374151" }}
                  >
                    {isBot ? (
                      <Bot size={15} className="text-gray-400" />
                    ) : p?.photoURL ? (
                      <img src={p.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      p?.displayName?.[0]?.toUpperCase() ?? "?"
                    )}
                  </div>

                  {/* Name + role label */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate leading-tight ${
                      alive ? (isP ? "text-yellow-100" : isC ? "text-blue-100" : "text-gray-200") : "text-gray-600 line-through"
                    }`}>
                      {p?.displayName?.split(" ")[0] ?? "?"}
                      {isMe && <span className="text-gray-500 font-normal text-xs"> (you)</span>}
                    </p>
                    {alive && isP && (
                      <p className="text-[9px] font-black text-yellow-500 uppercase tracking-widest leading-none flex items-center gap-0.5">
                        <Crown size={8} /> President
                      </p>
                    )}
                    {alive && isC && (
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none flex items-center gap-0.5">
                        <Landmark size={8} /> {game.phase === "election" ? "Nominated" : "Chancellor"}
                      </p>
                    )}
                  </div>

                  {/* Dead marker */}
                  {!alive && <Skull size={13} className="text-red-800 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col items-center gap-6 p-6">
          <PolicyBoard
            liberalCount={game.liberalPolicies}
            fascistCount={game.fascistPolicies}
            playerCount={game.players.length}
            electionTracker={game.electionTracker}
          />

          <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl p-6">
            {game.phase === "finished" ? (
              <FinishedScreen game={game} navigate={navigate} />
            ) : !isAlive ? (
              <div className="text-center py-8 text-gray-500">
                <Skull size={48} className="mx-auto mb-3 text-gray-600" />
                <p>You have been eliminated. Watch the game unfold.</p>
              </div>
            ) : game.phase === "election" ? (
              <ElectionPhase game={game} myUid={user.uid} gameId={gameId!} />
            ) : game.phase === "legislative" ? (
              <LegislativePhase game={game} myUid={user.uid} gameId={gameId!} />
            ) : game.phase === "executive" ? (
              <ExecutivePhase game={game} myUid={user.uid} gameId={gameId!} />
            ) : null}
          </div>

          {game.phase !== "finished" && (
            <p className="text-xs text-gray-700">
              Draw pile: {game.drawPile.length} tiles | Discard: {game.discardPile.length} tiles
              {" "}| Alive: {alivePlayers.length} players
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bot Turn Runner ──────────────────────────────────────────────────────────

async function runBotTurn(
  game: Game,
  gameId: string,
  botRoles: Record<string, Role>,
  presidentUid: string
): Promise<void> {
  const botUids = new Set(game.botUids ?? []);
  const aliveBots = (uid: string) => botUids.has(uid) && game.playerMap[uid]?.isAlive;

  // ── Election: nomination ────────────────────────────────────────────────────
  if (
    game.phase === "election" &&
    !game.votingOpen &&
    !game.nominatedChancellor &&
    aliveBots(presidentUid)
  ) {
    const myRole = botRoles[presidentUid] ?? "liberal";
    const chancellor = botDecideChancellor(game, presidentUid, myRole, botRoles);
    await nominateChancellor(gameId, chancellor);
    return;
  }

  // ── Election: voting (all bots vote sequentially) ───────────────────────────
  if (game.phase === "election" && game.votingOpen) {
    const botsToVote = game.players.filter(
      (uid) => aliveBots(uid) && !(uid in game.votes)
    );
    for (const uid of botsToVote) {
      const myRole = botRoles[uid] ?? "liberal";
      const vote = botDecideVote(game, uid, myRole, botRoles);
      await castVote(gameId, uid, vote);
      await delay(250);
    }
    return;
  }

  // ── Legislative: president discards ────────────────────────────────────────
  if (game.phase === "legislative" && game.drawnPolicies) {
    const actingPresident = game.lastPresidentUid;
    if (actingPresident && aliveBots(actingPresident)) {
      const myRole = botRoles[actingPresident] ?? "liberal";
      const idx = botPresidentDiscard(game.drawnPolicies, myRole);
      await presidentDiscard(gameId, idx);
      return;
    }
  }

  // ── Legislative: chancellor enacts ─────────────────────────────────────────
  if (game.phase === "legislative" && game.chancellorHand) {
    const actingChancellor = game.lastChancellorUid;
    if (actingChancellor && aliveBots(actingChancellor)) {
      const myRole = botRoles[actingChancellor] ?? "liberal";
      const idx = botChancellorEnact(game.chancellorHand, myRole);
      await chancellorEnact(gameId, idx);
      return;
    }
  }

  // ── Executive: presidential power ──────────────────────────────────────────
  if (game.phase === "executive" && game.pendingPower) {
    const actingPresident = game.lastPresidentUid;
    if (actingPresident && aliveBots(actingPresident)) {
      const myRole = botRoles[actingPresident] ?? "liberal";
      const target = botDecidePowerTarget(
        game,
        actingPresident,
        myRole,
        game.pendingPower,
        botRoles
      );
      await executePower(gameId, target, game.pendingPower);
      return;
    }
  }
}

// ─── Vote Result Overlay ──────────────────────────────────────────────────────

interface VoteSnapshot {
  votes: Record<string, boolean>;
  playerMap: Game["playerMap"];
  botUids: string[];
  presidentName: string;
  chancellorName: string;
  passed: boolean;
}

function VoteResultOverlay({
  snapshot,
  onClose,
}: {
  snapshot: VoteSnapshot;
  onClose: () => void;
}) {
  const { votes, playerMap, botUids, presidentName, chancellorName, passed } = snapshot;
  const allUids = Object.keys(votes);
  const jaUids   = allUids.filter((uid) => votes[uid]);
  const neinUids = allUids.filter((uid) => !votes[uid]);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 px-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl border-2 p-6 space-y-4 shadow-2xl ${
          passed
            ? "bg-green-950 border-green-700"
            : "bg-red-950 border-red-800"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex justify-center">
            {passed
              ? <CheckCircle2 size={48} className="text-green-400" />
              : <XCircle size={48} className="text-red-400" />}
          </div>
          <h2 className={`text-2xl font-black ${passed ? "text-green-300" : "text-red-300"}`}>
            {passed ? "Government Approved!" : "Government Rejected!"}
          </h2>
          <p className="text-gray-400 text-sm">
            <span className="text-white font-semibold">{presidentName}</span> +{" "}
            <span className="text-white font-semibold">{chancellorName}</span>
          </p>
        </div>

        {/* Vote columns */}
        <div className="grid grid-cols-2 gap-3">
          {/* Ja */}
          <div className="bg-green-900/40 border border-green-800 rounded-xl p-3 space-y-2">
            <p className="text-green-400 font-black text-center">
              Ja ✓ — {jaUids.length}
            </p>
            {jaUids.map((uid) => (
              <div key={uid} className="text-xs text-green-300 bg-green-900/50 rounded-lg px-2 py-1 truncate">
                {botUids.includes(uid) && <Bot size={10} className="inline mr-1" />}
                {playerMap[uid]?.displayName ?? uid}
              </div>
            ))}
          </div>

          {/* Nein */}
          <div className="bg-red-900/40 border border-red-800 rounded-xl p-3 space-y-2">
            <p className="text-red-400 font-black text-center">
              Nein ✗ — {neinUids.length}
            </p>
            {neinUids.map((uid) => (
              <div key={uid} className="text-xs text-red-300 bg-red-900/50 rounded-lg px-2 py-1 truncate">
                {botUids.includes(uid) && <Bot size={10} className="inline mr-1" />}
                {playerMap[uid]?.displayName ?? uid}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs">
          Tap anywhere or wait 3 seconds to continue
        </p>
      </div>
    </div>
  );
}

// ─── Finished Screen ──────────────────────────────────────────────────────────

function FinishedScreen({ game, navigate }: { game: Game; navigate: (path: string) => void }) {
  const isLibWin = game.winner === "liberal";
  return (
    <div className="text-center space-y-4 py-6">
      <div className="flex justify-center">
        {isLibWin
          ? <Shield size={64} className="text-blue-400" />
          : <Zap size={64} className="text-red-400" />}
      </div>
      <h2 className={`text-3xl font-black ${isLibWin ? "text-blue-400" : "text-red-400"}`}>
        {isLibWin ? "Liberals Win!" : "Fascists Win!"}
      </h2>
      <p className="text-gray-400">{game.winReason}</p>
      <div className="flex gap-3 justify-center pt-2">
        <button
          onClick={() => navigate(game.isSoloMode ? "/solo" : "/")}
          className="bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl px-6 py-3 transition"
        >
          {game.isSoloMode ? "Play Again" : "Home"}
        </button>
        <button
          onClick={() => navigate("/")}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl px-6 py-3 transition"
        >
          Home
        </button>
        <button
          onClick={() => navigate("/leaderboard")}
          className="bg-yellow-700 hover:bg-yellow-600 text-white font-semibold rounded-xl px-6 py-3 transition"
        >
          Leaderboard
        </button>
      </div>
    </div>
  );
}
