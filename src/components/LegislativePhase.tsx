import type { Game } from "../types/game";
import { presidentDiscard, chancellorEnact } from "../lib/gameActions";
import { PolicyCard, FaceDownCard } from "./PolicyCardArt";

interface LegislativePhaseProps {
  game: Game;
  myUid: string;
  gameId: string;
}

export default function LegislativePhase({ game, myUid, gameId }: LegislativePhaseProps) {
  const actualPresident = game.lastPresidentUid ?? game.players[game.presidentIndex];
  const chancellorUid = game.lastChancellorUid!;
  const isPresident = myUid === actualPresident;
  const isChancellor = myUid === chancellorUid;

  // President sees 3 cards — discard 1
  if (game.drawnPolicies && isPresident) {
    return (
      <div className="space-y-5 text-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Legislative Session</h2>
          <p className="text-gray-400 text-sm mt-1">
            You are the <span className="text-yellow-400 font-semibold">President</span>.{" "}
            Discard one policy tile.
          </p>
        </div>
        <div className="flex gap-4 justify-center flex-wrap">
          {game.drawnPolicies.map((p, i) => (
            <PolicyCard
              key={i}
              type={p}
              action="discard"
              onClick={() => presidentDiscard(gameId, i)}
            />
          ))}
        </div>
      </div>
    );
  }

  // President waiting
  if (game.drawnPolicies && !isPresident) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Legislative Session</h2>
        <p className="text-gray-400 text-sm">
          Waiting for{" "}
          <span className="text-yellow-400 font-semibold">
            {game.playerMap[actualPresident]?.displayName}
          </span>{" "}
          (President) to discard a policy…
        </p>
        <div className="flex gap-4 justify-center">
          {[0, 1, 2].map((i) => <FaceDownCard key={i} />)}
        </div>
      </div>
    );
  }

  // Chancellor sees 2 cards — enact 1
  if (game.chancellorHand && isChancellor) {
    return (
      <div className="space-y-5 text-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Legislative Session</h2>
          <p className="text-gray-400 text-sm mt-1">
            You are the <span className="text-yellow-400 font-semibold">Chancellor</span>.{" "}
            Enact one policy tile.
          </p>
        </div>
        <div className="flex gap-4 justify-center flex-wrap">
          {game.chancellorHand.map((p, i) => (
            <PolicyCard
              key={i}
              type={p}
              action="enact"
              onClick={() => chancellorEnact(gameId, i)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Chancellor waiting
  return (
    <div className="text-center space-y-4">
      <h2 className="text-2xl font-bold text-white">Legislative Session</h2>
      <p className="text-gray-400 text-sm">
        Waiting for{" "}
        <span className="text-yellow-400 font-semibold">
          {game.playerMap[chancellorUid]?.displayName}
        </span>{" "}
        (Chancellor) to enact a policy…
      </p>
      <div className="flex gap-4 justify-center">
        {[0, 1].map((i) => <FaceDownCard key={i} />)}
      </div>
    </div>
  );
}
