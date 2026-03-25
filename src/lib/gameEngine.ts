import type { Policy, Role, Game, Player } from "../types/game";

// ─── Policy Deck ────────────────────────────────────────────────────────────

export function buildDeck(): Policy[] {
  return shuffle([
    ...Array(6).fill("L"),
    ...Array(11).fill("F"),
  ] as Policy[]);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Role Assignment ─────────────────────────────────────────────────────────

export function assignRoles(playerCount: number): Role[] {
  const map: Record<number, { fascists: number; liberals: number }> = {
    5:  { fascists: 1, liberals: 3 },
    6:  { fascists: 1, liberals: 4 },
    7:  { fascists: 2, liberals: 4 },
    8:  { fascists: 2, liberals: 5 },
    9:  { fascists: 3, liberals: 5 },
    10: { fascists: 3, liberals: 6 },
  };
  const { fascists, liberals } = map[playerCount] ?? map[5];
  const roles: Role[] = [
    "hitler",
    ...Array(fascists).fill("fascist"),
    ...Array(liberals).fill("liberal"),
  ];
  return shuffle(roles);
}

// ─── Executive Powers ─────────────────────────────────────────────────────────

export function getExecutivePower(
  fascistPolicies: number,
  playerCount: number
): "investigate" | "peek" | "special_election" | "execution" | null {
  if (playerCount <= 6) {
    if (fascistPolicies === 3) return "peek";
    if (fascistPolicies === 4 || fascistPolicies === 5) return "execution";
  } else if (playerCount <= 8) {
    if (fascistPolicies === 2) return "investigate";
    if (fascistPolicies === 3) return "special_election";
    if (fascistPolicies === 4 || fascistPolicies === 5) return "execution";
  } else {
    if (fascistPolicies === 1 || fascistPolicies === 2) return "investigate";
    if (fascistPolicies === 3) return "special_election";
    if (fascistPolicies === 4 || fascistPolicies === 5) return "execution";
  }
  return null;
}

// ─── Win Conditions ───────────────────────────────────────────────────────────

export function checkWin(game: Partial<Game>): {
  winner: "liberal" | "fascist" | null;
  reason: string | null;
} {
  if ((game.liberalPolicies ?? 0) >= 5)
    return { winner: "liberal", reason: "5 Liberal policies enacted" };
  if ((game.fascistPolicies ?? 0) >= 6)
    return { winner: "fascist", reason: "6 Fascist policies enacted" };
  return { winner: null, reason: null };
}

// ─── Deck Reshuffle ───────────────────────────────────────────────────────────

export function ensureDeck(
  draw: Policy[],
  discard: Policy[]
): { draw: Policy[]; discard: Policy[] } {
  if (draw.length < 3) {
    const combined = shuffle([...draw, ...discard]);
    return { draw: combined, discard: [] };
  }
  return { draw, discard };
}

// ─── Initial Game State ───────────────────────────────────────────────────────

export function buildInitialGame(
  _gameId: string,
  hostUid: string,
  players: Player[]
): Omit<Game, "id"> {
  const draw = buildDeck();
  const playerUids = players.map((p) => p.uid);
  const playerMap = Object.fromEntries(players.map((p) => [p.uid, p]));

  return {
    status: "lobby",
    hostUid,
    players: playerUids,
    playerMap,
    round: 0,
    presidentIndex: 0,
    nominatedChancellor: null,
    votes: {},
    votingOpen: false,
    electionTracker: 0,
    liberalPolicies: 0,
    fascistPolicies: 0,
    drawPile: draw,
    discardPile: [],
    drawnPolicies: null,
    chancellorHand: null,
    lastPresidentUid: null,
    lastChancellorUid: null,
    phase: "lobby",
    pendingPower: null,
    winner: null,
    winReason: null,
    createdAt: Date.now(),
    isSoloMode: false,
    botUids: [],
  };
}
