# Secret Hitler — Project Overview

## What Is Secret Hitler?

Secret Hitler is a social deduction party game for 5–10 players. Players are secretly divided into two teams: **Liberals** and **Fascists** (one of whom is Secret Hitler). The Liberals try to pass liberal policies or assassinate Hitler; the Fascists try to pass fascist policies or get Hitler elected Chancellor.

---

## Game Roles

| Role | Team | Count (by player count) |
|------|------|--------------------------|
| Liberal | Liberal | Majority (~ceil(n/2)+1) |
| Fascist | Fascist | Minority |
| Hitler | Fascist | Always exactly 1 |

### Knowledge Rules
- **Liberals** know nothing — they only know their own role.
- **Fascists** (non-Hitler) know who Hitler is and who all other Fascists are.
- **Hitler** never knows who the Fascists are, regardless of player count.

---

## Game Components

### Policy Deck
- **6 Liberal policies** (blue)
- **11 Fascist policies** (red)
- Total: 17 policy tiles shuffled into a draw pile

### Boards
1. **Liberal Board** — tracks liberal policies enacted (need 5 to win)
2. **Fascist Board** — tracks fascist policies enacted (need 6 to win); also shows presidential powers unlocked at certain thresholds

### Election Tracker
- Tracks how many consecutive failed elections have occurred (max 3 before chaos)

---

## Turn Structure

Each round consists of three phases:

### Phase 1 — Election
1. The **Presidential Candidate** (rotates clockwise) nominates a **Chancellor**.
2. All players vote **Ja!** (yes) or **Nein!** (no) simultaneously.
3. If **majority votes Ja** → the government is formed (President + Chancellor take office).
4. If **majority votes Nein** → the nomination fails. The election tracker advances by 1.
   - If tracker reaches **3**, the top policy tile is enacted automatically (chaos), and the tracker resets.

> **Special Rule:** The previous President and Chancellor are "term-limited" and cannot be nominated as Chancellor (the previous Chancellor) or as President (not applicable since President rotates). The previous Chancellor cannot be nominated again immediately.

### Phase 2 — Legislative Session
1. The **President** draws **3 policy tiles** from the deck.
2. The President discards **1 tile** face-down and passes the remaining 2 to the Chancellor.
3. The **Chancellor** discards **1 tile** face-down and enacts the remaining tile by placing it on the board.
4. Discards are reshuffled when the draw pile runs low (< 3 tiles).

> Players may **claim** what policies they were dealt, but they can lie. This is the core bluffing/deduction mechanic.

### Phase 3 — Executive Action (Presidential Powers)
After a Fascist policy is enacted, the President may receive a power depending on the player count and how many fascist policies are on the board:

| Fascist Policies Enacted | Power (5–6 players) | Power (7–8 players) | Power (9–10 players) |
|--------------------------|---------------------|---------------------|----------------------|
| 1st | — | — | Investigate Loyalty |
| 2nd | — | Investigate Loyalty | Investigate Loyalty |
| 3rd | Policy Peek | Special Election | Special Election |
| 4th | Execution | Execution | Execution |
| 5th | Execution | Execution | Execution |

#### Presidential Powers Explained
- **Investigate Loyalty** — President secretly looks at another player's party membership card (Liberal or Fascist — NOT their specific role).
- **Policy Peek** — President secretly looks at the top 3 tiles of the policy draw pile.
- **Special Election** — President picks any player to be the next Presidential Candidate (skipping normal rotation).
- **Execution** — President kills a player. That player is out for the rest of the game. If Hitler is killed, Liberals win immediately.

---

## Win Conditions

### Liberals Win If:
- **5 Liberal policies** are enacted, OR
- **Hitler is assassinated** via the Execution power

### Fascists Win If:
- **6 Fascist policies** are enacted, OR
- **Hitler is elected Chancellor** after 3 or more Fascist policies are already on the board

---

## Strategy Notes

### For Liberals
- Pay attention to policy claims and call out contradictions.
- Be suspicious of consistent "I had no choice" claims from the same player.
- Use investigation results carefully — fascists can lie about what they saw.

### For Fascists
- Coordinate quietly with Hitler without being obvious.
- Blame chaotic policy outcomes on others.
- In larger games, Hitler must act like a Liberal without knowing who the other Fascists are.

### For Hitler
- In 5–6 player games: Hitler knows one Fascist — subtle coordination is possible.
- In 7–10 player games: Hitler must be elected Chancellor, so they must seem trustworthy.

---

## Player Count Breakdown

| Players | Liberals | Fascists (non-Hitler) | Hitler |
|---------|----------|-----------------------|--------|
| 5       | 3        | 1                     | 1      |
| 6       | 4        | 1                     | 1      |
| 7       | 4        | 2                     | 1      |
| 8       | 5        | 2                     | 1      |
| 9       | 5        | 3                     | 1      |
| 10      | 6        | 3                     | 1      |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript |
| Styling | Tailwind CSS |
| Real-time Game State | Firebase Realtime Database or Firestore |
| Authentication | Firebase Auth (Google / Email) |
| Leaderboard | Firebase Firestore |
| Hosting | Firebase Hosting |

---

## Firebase Config

```ts
const firebaseConfig = {
  apiKey: "AIzaSyDAs522DZjVye99RqDDVgfc6e4g38pdlZY",
  authDomain: "secret-hitler-8cf81.firebaseapp.com",
  projectId: "secret-hitler-8cf81",
  storageBucket: "secret-hitler-8cf81.firebasestorage.app",
  messagingSenderId: "348276854841",
  appId: "1:348276854841:web:6c59a7c24450703dff3de8"
};
```

---

## Planned Features

- [ ] User authentication (Google / Email sign-in)
- [ ] Create & join game lobbies (share room code)
- [ ] Role assignment with secret reveals
- [ ] Real-time voting (Ja/Nein)
- [ ] Legislative session (policy draw/discard flow)
- [ ] Presidential powers UI
- [ ] Win condition detection
- [ ] Leaderboard (wins, games played, win rate by role)
- [ ] Game history / replay log
- [ ] Chat / accusation panel

---

## Firestore Data Model (Planned)

### `users/{uid}`
```json
{
  "displayName": "Alice",
  "photoURL": "...",
  "gamesPlayed": 14,
  "wins": 7,
  "winsByRole": { "liberal": 4, "fascist": 2, "hitler": 1 }
}
```

### `games/{gameId}`
```json
{
  "status": "lobby | in_progress | finished",
  "hostUid": "uid123",
  "players": ["uid1", "uid2", "..."],
  "round": 3,
  "presidentIndex": 2,
  "electionTracker": 0,
  "liberalPolicies": 2,
  "fascistPolicies": 3,
  "drawPile": ["F","L","F","..."],
  "discardPile": [],
  "lastPresident": "uid1",
  "lastChancellor": "uid2",
  "phase": "election | legislative | executive",
  "winner": null
}
```

### `games/{gameId}/roles/{uid}` (private per-player)
```json
{
  "role": "liberal | fascist | hitler",
  "knownFascists": ["uid3"]
}
```

### `leaderboard` (Firestore collection)
Aggregated from `users` — sorted by wins or win rate.
