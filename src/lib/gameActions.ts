import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  increment,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { Game, Player, Policy, PrivateRole } from "../types/game";
import {
  buildInitialGame,
  assignRoles,
  getExecutivePower,
  checkWin,
  ensureDeck,
  shuffle,
} from "./gameEngine";
import { makeBotPlayer } from "./botLogic";

/** Returns the index of the next alive player clockwise from currentIndex. */
function nextAlivePresidentIndex(
  currentIndex: number,
  players: string[],
  playerMap: Record<string, { isAlive: boolean }>
): number {
  const n = players.length;
  let next = (currentIndex + 1) % n;
  for (let i = 0; i < n; i++) {
    if (playerMap[players[next]]?.isAlive) return next;
    next = (next + 1) % n;
  }
  return next; // fallback: no alive player found (shouldn't happen)
}

// ─── Create Game ─────────────────────────────────────────────────────────────

export async function createGame(host: Player): Promise<string> {
  const ref = doc(collection(db, "games"));
  const gameData = buildInitialGame(ref.id, host.uid, [host]);
  await setDoc(ref, { ...gameData, id: ref.id });
  return ref.id;
}

// ─── Join Game ────────────────────────────────────────────────────────────────

export async function joinGame(gameId: string, player: Player): Promise<void> {
  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Game not found.");
  const game = snap.data() as Game;
  if (game.status !== "lobby") throw new Error("Game already started.");
  if (game.players.length >= 10) throw new Error("Game is full (max 10 players).");
  if (game.players.includes(player.uid)) return; // already in

  // arrayUnion is atomic — prevents race condition when two players join simultaneously
  await updateDoc(ref, {
    players: arrayUnion(player.uid),
    [`playerMap.${player.uid}`]: player,
  });
}

// ─── Start Game ───────────────────────────────────────────────────────────────

export async function startGame(gameId: string): Promise<void> {
  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Game not found.");
  const game = snap.data() as Game;

  const count = game.players.length;
  if (count < 5) throw new Error("Need at least 5 players to start.");

  // Assign roles
  const roles = assignRoles(count);
  const hitlerUid = game.players[roles.indexOf("hitler")];
  const fascistUids = game.players.filter((_, i) => roles[i] === "fascist");

  // Write private role docs
  for (let i = 0; i < game.players.length; i++) {
    const uid = game.players[i];
    const role = roles[i];
    // Fascists know all other fascists + Hitler; Hitler knows nobody
    const knownFascists = role === "fascist" ? fascistUids.filter((id) => id !== uid) : [];
    const knownHitler = role === "fascist" ? hitlerUid : null;

    await setDoc(doc(db, "games", gameId, "roles", uid), {
      role,
      knownFascists,
      hitlerUid: knownHitler,
    } as PrivateRole);
  }

  // Update game to in_progress
  await updateDoc(ref, {
    status: "in_progress",
    phase: "election",
    round: 1,
    presidentIndex: 0,
  });
}

// ─── Nominate Chancellor ─────────────────────────────────────────────────────

export async function nominateChancellor(
  gameId: string,
  chancellorUid: string
): Promise<void> {
  const ref = doc(db, "games", gameId);
  await updateDoc(ref, {
    nominatedChancellor: chancellorUid,
    votes: {},
    votingOpen: true,
  });
}

// ─── Cast Vote ───────────────────────────────────────────────────────────────

export async function castVote(
  gameId: string,
  uid: string,
  vote: boolean
): Promise<void> {
  const ref = doc(db, "games", gameId);

  // Step 1: Guard check — bail early if voting is no longer open
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const game = snap.data() as Game;
  if (!game.votingOpen || game.phase !== "election") return;

  // Step 2: Write just this player's vote atomically
  await updateDoc(ref, { [`votes.${uid}`]: vote });

  // Step 3: Re-read fresh state to see all concurrent votes
  const freshSnap = await getDoc(ref);
  if (!freshSnap.exists()) return;
  const fresh = freshSnap.data() as Game;

  // If another caller already tallied, bail
  if (!fresh.votingOpen || fresh.phase !== "election") return;

  const alivePlayers = fresh.players.filter((id) => fresh.playerMap[id]?.isAlive);
  const allVoted = alivePlayers.every((id) => id in fresh.votes);
  if (!allVoted) return;

  // Step 4: Tally using fresh state
  const jaCount = Object.values(fresh.votes).filter(Boolean).length;
  const majority = jaCount > alivePlayers.length / 2;

  if (majority) {
    // Government formed — check if Hitler is elected as Chancellor with 3+ fascist policies
    const roleSnap = await getDoc(doc(db, "games", gameId, "roles", fresh.nominatedChancellor!));
    const role = roleSnap.exists() ? (roleSnap.data() as PrivateRole).role : null;

    if (role === "hitler" && fresh.fascistPolicies >= 3) {
      await updateDoc(ref, {
        votingOpen: false,
        winner: "fascist",
        winReason: "Hitler was elected Chancellor",
        phase: "finished",
        status: "finished",
      });
      return;
    }

    // Draw 3 policies
    const { draw, discard } = ensureDeck(fresh.drawPile, fresh.discardPile);
    const drawnPolicies = draw.slice(0, 3);
    const remaining = draw.slice(3);

    await updateDoc(ref, {
      votingOpen: false,
      electionTracker: 0,
      lastPresidentUid: fresh.players[fresh.presidentIndex],
      lastChancellorUid: fresh.nominatedChancellor,
      drawnPolicies,
      drawPile: remaining,
      discardPile: discard,
      phase: "legislative",
    });
  } else {
    // Failed election — advance tracker
    const newTracker = fresh.electionTracker + 1;

    if (newTracker >= 3) {
      // Chaos: enact top policy automatically
      const { draw, discard } = ensureDeck(fresh.drawPile, fresh.discardPile);
      const enacted = draw[0] as Policy;
      const isLib = enacted === "L";
      const newLib = fresh.liberalPolicies + (isLib ? 1 : 0);
      const newFas = fresh.fascistPolicies + (isLib ? 0 : 1);
      const { winner, reason } = checkWin({ liberalPolicies: newLib, fascistPolicies: newFas });

      const nextPresidentIndex = nextAlivePresidentIndex(fresh.presidentIndex, fresh.players, fresh.playerMap);

      await updateDoc(ref, {
        votingOpen: false,
        electionTracker: 0,
        liberalPolicies: newLib,
        fascistPolicies: newFas,
        drawPile: draw.slice(1),
        discardPile: discard,
        nominatedChancellor: null,
        lastPresidentUid: null,
        lastChancellorUid: null,
        presidentIndex: nextPresidentIndex,
        round: fresh.round + 1,
        phase: winner ? "finished" : "election",
        status: winner ? "finished" : "in_progress",
        winner: winner ?? null,
        winReason: reason ?? null,
      });
      return;
    }

    const nextPresidentIndex = nextAlivePresidentIndex(fresh.presidentIndex, fresh.players, fresh.playerMap);

    await updateDoc(ref, {
      votingOpen: false,
      electionTracker: newTracker,
      nominatedChancellor: null,
      presidentIndex: nextPresidentIndex,
      round: fresh.round + 1,
      phase: "election",
    });
  }
}

// ─── President Discards ───────────────────────────────────────────────────────

export async function presidentDiscard(
  gameId: string,
  discardIndex: number
): Promise<void> {
  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const game = snap.data() as Game;

  // Guard: president's hand must exist and have cards (prevents acting on stale/empty state)
  if (!game.drawnPolicies || game.drawnPolicies.length === 0) return;

  const hand = [...game.drawnPolicies];
  const discarded = hand.splice(discardIndex, 1)[0];

  await updateDoc(ref, {
    drawnPolicies: null,
    chancellorHand: hand,
    discardPile: [...game.discardPile, discarded],
  });
}

// ─── Chancellor Enacts ────────────────────────────────────────────────────────

export async function chancellorEnact(
  gameId: string,
  enactIndex: number
): Promise<void> {
  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const game = snap.data() as Game;

  // Guard: chancellor's hand must exist and have cards (prevents acting on stale/empty state)
  if (!game.chancellorHand || game.chancellorHand.length === 0) return;

  const hand = [...game.chancellorHand];
  const enacted = hand.splice(enactIndex, 1)[0] as Policy;
  const discarded = hand[0];

  const isLib = enacted === "L";
  const newLib = game.liberalPolicies + (isLib ? 1 : 0);
  const newFas = game.fascistPolicies + (isLib ? 0 : 1);

  const { winner, reason } = checkWin({ liberalPolicies: newLib, fascistPolicies: newFas });

  const power = isLib
    ? null
    : getExecutivePower(newFas, game.players.length);

  const nextPresidentIndex = nextAlivePresidentIndex(game.presidentIndex, game.players, game.playerMap);

  if (winner) {
    await updateDoc(ref, {
      chancellorHand: null,
      discardPile: [...game.discardPile, discarded],
      liberalPolicies: newLib,
      fascistPolicies: newFas,
      winner,
      winReason: reason,
      phase: "finished",
      status: "finished",
    });
    return;
  }

  await updateDoc(ref, {
    chancellorHand: null,
    discardPile: [...game.discardPile, discarded],
    liberalPolicies: newLib,
    fascistPolicies: newFas,
    pendingPower: power,
    presidentIndex: nextPresidentIndex,
    nominatedChancellor: null,
    round: game.round + 1,
    phase: power ? "executive" : "election",
  });
}

// ─── Executive Powers ─────────────────────────────────────────────────────────

export async function executePower(
  gameId: string,
  targetUid: string,
  power: string
): Promise<void> {
  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const game = snap.data() as Game;

  if (power === "execution") {
    // Kill the player
    const updatedPlayerMap = {
      ...game.playerMap,
      [targetUid]: { ...game.playerMap[targetUid], isAlive: false },
    };

    // Check if Hitler was killed
    const roleSnap = await getDoc(doc(db, "games", gameId, "roles", targetUid));
    const role = roleSnap.exists() ? (roleSnap.data() as PrivateRole).role : null;

    if (role === "hitler") {
      await updateDoc(ref, {
        playerMap: updatedPlayerMap,
        pendingPower: null,
        winner: "liberal",
        winReason: "Hitler was executed",
        phase: "finished",
        status: "finished",
      });
      return;
    }

    await updateDoc(ref, {
      playerMap: updatedPlayerMap,
      pendingPower: null,
      phase: "election",
    });
  } else if (power === "special_election") {
    // The target becomes the next president
    const newIndex = game.players.indexOf(targetUid);
    await updateDoc(ref, {
      presidentIndex: newIndex,
      pendingPower: null,
      phase: "election",
    });
  } else {
    // investigate / peek — just clear the power, actual reveal is done in UI
    await updateDoc(ref, {
      pendingPower: null,
      phase: "election",
    });
  }
}

// ─── Leaderboard (self-update only) ──────────────────────────────────────────
// Each player calls this for themselves when the game ends.
// This avoids writing to other users' documents (security rules block cross-user writes).

export async function recordMyResult(
  gameId: string,
  myUid: string,
  winner: "liberal" | "fascist"
): Promise<void> {
  const roleSnap = await getDoc(doc(db, "games", gameId, "roles", myUid));
  const role = roleSnap.exists() ? (roleSnap.data() as PrivateRole).role : null;
  if (!role) return;

  const isWinner =
    (winner === "liberal" && role === "liberal") ||
    (winner === "fascist" && (role === "fascist" || role === "hitler"));

  await updateDoc(doc(db, "users", myUid), {
    gamesPlayed: increment(1),
    wins: isWinner ? increment(1) : increment(0),
    [`winsByRole.${role}`]: isWinner ? increment(1) : increment(0),
  });
}

// ─── Fetch Private Role ───────────────────────────────────────────────────────

export async function fetchMyRole(
  gameId: string,
  uid: string
): Promise<PrivateRole | null> {
  const snap = await getDoc(doc(db, "games", gameId, "roles", uid));
  return snap.exists() ? (snap.data() as PrivateRole) : null;
}

// ─── Policy Peek ─────────────────────────────────────────────────────────────

export function peekTopPolicies(game: Game): Policy[] {
  return game.drawPile.slice(0, 3);
}

// ─── Investigate ─────────────────────────────────────────────────────────────

export async function investigatePlayer(
  gameId: string,
  targetUid: string
): Promise<"liberal" | "fascist"> {
  const snap = await getDoc(doc(db, "games", gameId, "roles", targetUid));
  if (!snap.exists()) throw new Error("Role not found");
  const role = (snap.data() as PrivateRole).role;
  return role === "liberal" ? "liberal" : "fascist";
}

// ─── Reshuffle if needed ──────────────────────────────────────────────────────

export async function reshuffleIfNeeded(gameId: string): Promise<void> {
  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const game = snap.data() as Game;
  if (game.drawPile.length >= 3) return;

  const combined = shuffle([...game.drawPile, ...game.discardPile]) as Policy[];
  await updateDoc(ref, { drawPile: combined, discardPile: [] });
}

// ─── Create & Start Solo Game ─────────────────────────────────────────────────

export async function createSoloGame(
  human: Player,
  totalPlayers: number // 5–10
): Promise<string> {
  const botCount = totalPlayers - 1;
  const bots = Array.from({ length: botCount }, (_, i) => makeBotPlayer(i));
  const botUids = bots.map((b) => b.uid);

  // Shuffle player order so human isn't always first
  const allPlayers = shuffle([human, ...bots]) as Player[];

  const ref = doc(collection(db, "games"));
  const gameData = buildInitialGame(ref.id, human.uid, allPlayers);

  // Assign roles
  const roles = assignRoles(totalPlayers);
  const playerUids = allPlayers.map((p) => p.uid);
  const hitlerUid = playerUids[roles.indexOf("hitler")];
  const fascistUids = playerUids.filter((_, i) => roles[i] === "fascist");

  // Write game document (in_progress immediately — no lobby)
  await setDoc(ref, {
    ...gameData,
    id: ref.id,
    status: "in_progress",
    phase: "election",
    round: 1,
    isSoloMode: true,
    botUids,
  });

  // Write private role docs for every player (human + bots)
  for (let i = 0; i < playerUids.length; i++) {
    const uid = playerUids[i];
    const role = roles[i];
    const knownFascists = role === "fascist" ? fascistUids.filter((id) => id !== uid) : [];
    const knownHitler = role === "fascist" ? hitlerUid : null;

    await setDoc(doc(db, "games", ref.id, "roles", uid), {
      role,
      knownFascists,
      hitlerUid: knownHitler,
    } as PrivateRole);
  }

  return ref.id;
}

// ─── Fetch All Roles (solo mode — host drives all bots) ───────────────────────

export async function fetchAllRoles(
  gameId: string,
  uids: string[]
): Promise<Record<string, PrivateRole>> {
  const entries = await Promise.all(
    uids.map(async (uid) => {
      const snap = await getDoc(doc(db, "games", gameId, "roles", uid));
      return [uid, snap.exists() ? (snap.data() as PrivateRole) : null] as const;
    })
  );
  return Object.fromEntries(entries.filter(([, v]) => v !== null)) as Record<string, PrivateRole>;
}


