export type Role = "liberal" | "fascist" | "hitler";
export type Party = "liberal" | "fascist";
export type Policy = "L" | "F";
export type GamePhase =
  | "lobby"
  | "election"
  | "legislative"
  | "executive"
  | "finished";
export type ExecutivePower =
  | "investigate"
  | "peek"
  | "special_election"
  | "execution"
  | null;

export interface Player {
  uid: string;
  displayName: string;
  photoURL: string;
  isAlive: boolean;
  isReady: boolean;
}

export interface PrivateRole {
  role: Role;
  knownFascists: string[]; // uids of fellow fascists (NOT including Hitler)
  hitlerUid: string | null; // set only for fascists; null for liberal/hitler
}

export interface Vote {
  [uid: string]: boolean; // true = Ja, false = Nein
}

export interface Game {
  id: string;
  status: "lobby" | "in_progress" | "finished";
  hostUid: string;
  players: string[]; // ordered uids
  playerMap: { [uid: string]: Player };
  round: number;
  presidentIndex: number;
  nominatedChancellor: string | null;
  votes: Vote;
  votingOpen: boolean;
  electionTracker: number;
  liberalPolicies: number;
  fascistPolicies: number;
  drawPile: Policy[];
  discardPile: Policy[];
  drawnPolicies: Policy[] | null; // president's hand (3 cards)
  chancellorHand: Policy[] | null; // chancellor's hand (2 cards)
  lastPresidentUid: string | null;
  lastChancellorUid: string | null;
  phase: GamePhase;
  pendingPower: ExecutivePower;
  winner: "liberal" | "fascist" | null;
  winReason: string | null;
  createdAt: number;
  // Solo mode
  isSoloMode: boolean;
  botUids: string[];
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL: string;
  gamesPlayed: number;
  wins: number;
  winsByRole: {
    liberal: number;
    fascist: number;
    hitler: number;
  };
}
