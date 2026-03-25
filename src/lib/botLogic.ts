import type { Game, Policy, Role } from "../types/game";

// ─── Bot Names ────────────────────────────────────────────────────────────────

const BOT_NAMES = [
  "Klaus", "Greta", "Hans", "Elsa",
  "Fritz", "Liesel", "Otto", "Werner", "Brunhilde",
];

export function makeBotUid(index: number): string {
  return `bot_${index}`;
}

export function makeBotPlayer(index: number) {
  return {
    uid: makeBotUid(index),
    displayName: BOT_NAMES[index % BOT_NAMES.length],
    photoURL: "",
    isAlive: true,
    isReady: true,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export { delay };

// ─── Nomination ───────────────────────────────────────────────────────────────

export function botDecideChancellor(
  game: Game,
  presidentUid: string,
  myRole: Role,
  allRoles: Record<string, Role>
): string {
  const ineligible = new Set<string>([presidentUid]);
  if (game.lastChancellorUid) ineligible.add(game.lastChancellorUid);
  if (game.players.length > 5 && game.lastPresidentUid) {
    ineligible.add(game.lastPresidentUid);
  }

  const candidatePool = game.players.filter(
    (uid) => !ineligible.has(uid) && game.playerMap[uid]?.isAlive
  );
  // If term limits leave no candidates, relax them (edge case with few alive players)
  const eligible = candidatePool.length > 0
    ? candidatePool
    : game.players.filter((uid) => uid !== presidentUid && game.playerMap[uid]?.isAlive);

  if (myRole === "fascist" || myRole === "hitler") {
    // Prefer nominating Hitler as chancellor if 3+ fascist policies
    if (game.fascistPolicies >= 3) {
      const hitler = eligible.find((uid) => allRoles[uid] === "hitler");
      if (hitler) return hitler;
    }
    // Otherwise prefer fellow fascists
    const fascistOption = eligible.find(
      (uid) => allRoles[uid] === "fascist" || allRoles[uid] === "hitler"
    );
    if (fascistOption && Math.random() > 0.3) return fascistOption;
  }

  return randomItem(eligible);
}

// ─── Voting ───────────────────────────────────────────────────────────────────

export function botDecideVote(
  game: Game,
  _botUid: string,
  myRole: Role,
  allRoles: Record<string, Role>
): boolean {
  const chancellorRole = allRoles[game.nominatedChancellor ?? ""];
  const presidentRole = allRoles[game.players[game.presidentIndex]];

  if (myRole === "liberal") {
    // Reject if nominated chancellor is a known fascist/hitler
    if (chancellorRole === "fascist" || chancellorRole === "hitler") {
      return Math.random() > 0.85; // 15% ja (mistake / deception by bots)
    }
    // If both are liberals, very likely to approve
    if (presidentRole === "liberal" && chancellorRole === "liberal") {
      return Math.random() > 0.1;
    }
    // Unknown / mixed — moderate yes bias
    return Math.random() > 0.35;
  }

  if (myRole === "fascist" || myRole === "hitler") {
    // Strongly approve fascist governments
    if (
      chancellorRole === "fascist" ||
      chancellorRole === "hitler" ||
      presidentRole === "fascist" ||
      presidentRole === "hitler"
    ) {
      return Math.random() > 0.1; // 90% ja
    }
    // If 3+ fascist policies: approve Hitler as chancellor (win condition)
    if (game.fascistPolicies >= 3 && (chancellorRole as string) === "hitler") return true;
    // Otherwise random lean towards Ja
    return Math.random() > 0.4;
  }

  // Bot is itself the nominee — never vote for themselves (president side)
  return Math.random() > 0.4;
}

// ─── Legislative: President Discards ─────────────────────────────────────────

export function botPresidentDiscard(hand: Policy[], myRole: Role): number {
  if (myRole === "liberal") {
    // Discard a Fascist tile if possible
    const idx = hand.findIndex((p) => p === "F");
    if (idx !== -1) return idx;
  } else {
    // Fascist/Hitler: discard a Liberal tile if possible
    const idx = hand.findIndex((p) => p === "L");
    if (idx !== -1) return idx;
    // All fascist — still discard one (can't help it, pick first)
  }
  return 0;
}

// ─── Legislative: Chancellor Enacts ──────────────────────────────────────────

export function botChancellorEnact(hand: Policy[], myRole: Role): number {
  if (myRole === "liberal") {
    // Enact Liberal if available
    const idx = hand.findIndex((p) => p === "L");
    if (idx !== -1) return idx;
    // Forced to enact fascist
    return 0;
  } else {
    // Enact Fascist if available
    const idx = hand.findIndex((p) => p === "F");
    if (idx !== -1) return idx;
    // Forced to enact liberal
    return 0;
  }
}

// ─── Executive Power Decision ─────────────────────────────────────────────────

export function botDecidePowerTarget(
  game: Game,
  presidentUid: string,
  myRole: Role,
  power: string,
  allRoles: Record<string, Role>
): string {
  const alivePlayers = game.players.filter(
    (uid) => game.playerMap[uid]?.isAlive && uid !== presidentUid
  );

  if (power === "execution") {
    if (myRole === "liberal") {
      // Try to execute someone who is fascist/hitler
      const target = alivePlayers.find(
        (uid) => allRoles[uid] === "fascist" || allRoles[uid] === "hitler"
      );
      if (target && Math.random() > 0.3) return target;
    } else {
      // Fascist: execute a liberal, avoid killing own team
      const target = alivePlayers.find((uid) => allRoles[uid] === "liberal");
      if (target) return target;
    }
    return randomItem(alivePlayers);
  }

  if (power === "special_election") {
    if (myRole === "fascist" || myRole === "hitler") {
      // Pick a fellow fascist/hitler to be president
      const fascist = alivePlayers.find(
        (uid) => allRoles[uid] === "fascist" || allRoles[uid] === "hitler"
      );
      if (fascist) return fascist;
    }
    return randomItem(alivePlayers);
  }

  // investigate / peek — just pick a random player (result handled by game engine)
  return randomItem(alivePlayers);
}
