import { Eye, Search, Crown, ChevronRight, AlertTriangle, Skull } from "lucide-react";
import { PolicyCardMini } from "./PolicyCardArt";
import type { Policy } from "../types/game";

interface PolicyBoardProps {
  liberalCount: number;
  fascistCount: number;
  playerCount: number;
  electionTracker: number;
}

export default function PolicyBoard({
  liberalCount,
  fascistCount,
  playerCount,
  electionTracker,
}: PolicyBoardProps) {
  const fascistPowers = getFascistPowers(playerCount);
  return (
    <div className="space-y-3 w-full max-w-2xl">
      <LiberalBoard liberalCount={liberalCount} electionTracker={electionTracker} />
      <FascistBoard fascistCount={fascistCount} powers={fascistPowers} />
    </div>
  );
}

// ── Liberal Board ─────────────────────────────────────────────────────────────

function LiberalBoard({
  liberalCount,
  electionTracker,
}: {
  liberalCount: number;
  electionTracker: number;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden select-none"
      style={{
        background: "linear-gradient(150deg,#0e7490 0%,#155e75 55%,#164e63 100%)",
        boxShadow: "0 0 0 3px #67e8f9, 0 0 0 6px #155e75, 0 4px 24px rgba(0,0,0,0.5)",
      }}
    >
      {/* Inner decorative border */}
      <div className="m-2 border-2 border-cyan-300/50 rounded-lg p-2 space-y-2">

        {/* Title */}
        <div className="flex items-center gap-2">
          <Wheats />
          <h2
            className="text-cyan-50 font-black tracking-[0.4em] text-base shrink-0 px-1"
            style={{ fontFamily: "Georgia,serif", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
          >
            LIBERAL
          </h2>
          <Wheats flip />
        </div>

        {/* Policy slots row */}
        <div className="flex items-stretch gap-0 rounded-lg overflow-hidden border-2 border-cyan-300/50">
          {/* Draw pile side label */}
          <SideLabel text="DRAW PILE" side="left" color="cyan" />

          {Array.from({ length: 5 }).map((_, i) => (
            <PolicySlot key={i} enacted={i < liberalCount} type="liberal" isLast={i === 4} />
          ))}

          {/* Discard pile side label */}
          <SideLabel text="DISCARD PILE" side="right" color="cyan" />
        </div>

        {/* Election tracker */}
        <ElectionTracker value={electionTracker} />
      </div>
    </div>
  );
}

// ── Fascist Board ─────────────────────────────────────────────────────────────

function FascistBoard({
  fascistCount,
  powers,
}: {
  fascistCount: number;
  powers: (string | null)[];
}) {
  return (
    <div
      className="rounded-xl overflow-hidden select-none"
      style={{
        background: "linear-gradient(150deg,#b91c1c 0%,#7f1d1d 55%,#450a0a 100%)",
        boxShadow: "0 0 0 3px #f87171, 0 0 0 6px #7f1d1d, 0 4px 24px rgba(0,0,0,0.5)",
      }}
    >
      <div className="m-2 border-2 border-red-400/60 rounded-lg p-2 space-y-2">

        {/* Title */}
        <div className="flex items-center gap-2">
          <ChainRow />
          <h2
            className="text-red-50 font-black tracking-[0.4em] text-base shrink-0 px-1"
            style={{ fontFamily: "Georgia,serif", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
          >
            FASCIST
          </h2>
          <ChainRow />
        </div>

        {/* Hitler win banner */}
        <div className="border border-red-400/40 rounded bg-black/20 py-0.5 text-center">
          <span className="text-red-200 font-bold tracking-widest" style={{ fontSize: 8 }}>
            FASCISTS WIN IF HITLER IS ELECTED CHANCELLOR
          </span>
        </div>

        {/* Policy slots */}
        <div className="flex rounded-lg overflow-hidden border-2 border-red-400/50">
          {/* Sword side label */}
          <SideLabel text="DRAW PILE" side="left" color="red" />

          {Array.from({ length: 6 }).map((_, i) => {
            const power = powers[i];
            const isHitlerSlot = i === 5;
            const isPowerZone = power !== null || isHitlerSlot;
            return (
              <div
                key={i}
                className={`flex-1 flex flex-col border-r last:border-r-0 border-red-400/30 ${
                  isPowerZone ? "bg-red-950/50" : "bg-transparent"
                }`}
              >
                <PolicySlot enacted={i < fascistCount} type="fascist" isLast={i === 5} noBorder />
                {/* Power zone */}
                <div className="flex flex-col items-center justify-start px-0.5 pb-1 pt-0.5 gap-0.5 min-h-[40px]">
                  {isHitlerSlot ? (
                    <>
                      <div className="w-6 h-6 rounded-full bg-orange-900/60 border border-orange-500/60 flex items-center justify-center">
                        <Skull size={12} className="text-orange-300" />
                      </div>
                      <span className="text-orange-300/90 font-bold text-center leading-tight" style={{ fontSize: 7 }}>
                        HITLER WINS
                      </span>
                    </>
                  ) : power ? (
                    <>
                      <FascistPowerIcon power={power} />
                      <span className="text-red-200/80 font-semibold text-center leading-tight" style={{ fontSize: 7 }}>
                        {POWER_LABELS[power] ?? power.toUpperCase()}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}

          <SideLabel text="DISCARD PILE" side="right" color="red" />
        </div>

      </div>
    </div>
  );
}

// ── Policy Slot ───────────────────────────────────────────────────────────────

function PolicySlot({
  enacted,
  type,
  noBorder,
}: {
  enacted: boolean;
  type: "liberal" | "fascist";
  isLast: boolean;
  noBorder?: boolean;
}) {
  const isLib = type === "liberal";
  const policyType: Policy = isLib ? "L" : "F";
  const borderCls = isLib ? "border-cyan-300/40" : "border-red-400/30";

  if (enacted) {
    return (
      <div
        className={`flex-1 flex items-stretch border-r last:border-r-0 ${borderCls} p-1 transition-all duration-700`}
        style={{ minHeight: 92 }}
      >
        <PolicyCardMini type={policyType} />
      </div>
    );
  }

  // Empty slot
  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center border-r last:border-r-0 ${
        noBorder ? "border-red-400/30" : borderCls
      }`}
      style={{ minHeight: 92 }}
    >
      <div
        className={`w-[82%] rounded-lg flex items-center justify-center border-2 border-dashed ${
          isLib ? "border-cyan-300/25 bg-cyan-900/10" : "border-red-400/20 bg-red-900/10"
        }`}
        style={{ minHeight: 76 }}
      >
        <span className={`text-3xl font-thin ${isLib ? "text-cyan-400/15" : "text-red-500/15"}`}>·</span>
      </div>
    </div>
  );
}

// ── Election Tracker ──────────────────────────────────────────────────────────

function ElectionTracker({ value }: { value: number }) {
  return (
    <div className="border border-cyan-400/40 rounded-lg bg-cyan-950/30 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className="text-cyan-200 font-black tracking-widest shrink-0"
          style={{ fontSize: 9 }}
        >
          ELECTION TRACKER
        </span>
        <div className="h-3 w-px bg-cyan-400/40 shrink-0" />
        <div className="flex items-center gap-1.5 flex-wrap">
          {[1, 2, 3].map((n) => {
            const filled = n <= value;
            return (
              <div key={n} className="flex items-center gap-1">
                {/* Circle */}
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    filled
                      ? "border-red-400 bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                      : "border-cyan-400/50 bg-cyan-900/30"
                  }`}
                >
                  {filled && <AlertTriangle size={10} className="text-white" />}
                </div>
                {/* Arrow between circles */}
                {n < 3 && (
                  <div className="flex items-center gap-0.5">
                    <span
                      className={`font-bold ${filled ? "text-red-400" : "text-cyan-400/40"}`}
                      style={{ fontSize: 8 }}
                    >
                      FAIL
                    </span>
                    <ChevronRight size={10} className={filled ? "text-red-400" : "text-cyan-400/40"} />
                  </div>
                )}
              </div>
            );
          })}
          {/* Final arrow → chaos */}
          <div className="flex items-center gap-1">
            <ChevronRight size={10} className={value >= 3 ? "text-red-400" : "text-cyan-400/40"} />
            <div
              className={`border rounded px-1 py-0.5 ${
                value >= 3
                  ? "border-red-500 bg-red-900/60 text-red-200"
                  : "border-cyan-400/30 bg-cyan-900/20 text-cyan-400/50"
              }`}
            >
              <span className="font-bold" style={{ fontSize: 8 }}>
                TOP POLICY ENACTED
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Decorative Helpers ────────────────────────────────────────────────────────

function SideLabel({ text, side, color }: { text: string; side: "left" | "right"; color: "cyan" | "red" }) {
  const c = color === "cyan" ? "text-cyan-200/70" : "text-red-200/60";
  const rotate = side === "left" ? "rotate(180deg)" : "none";
  return (
    <div className="flex flex-col items-center justify-center px-1 shrink-0">
      <span
        className={`${c} font-bold tracking-widest`}
        style={{ writingMode: "vertical-rl", transform: rotate, fontSize: 7 }}
      >
        {text}
      </span>
    </div>
  );
}

function Wheats({ flip }: { flip?: boolean }) {
  const nodes = [14, 10, 7, 5, 3];
  const list = flip ? [...nodes].reverse() : nodes;
  return (
    <div className={`flex-1 flex items-center gap-px overflow-hidden ${flip ? "flex-row-reverse" : ""}`}>
      <div className="flex-1 h-px bg-cyan-300/50" />
      {list.map((w, i) => (
        <div
          key={i}
          className="bg-cyan-300/50 rounded-full shrink-0"
          style={{ width: w, height: 5 }}
        />
      ))}
    </div>
  );
}

function ChainRow() {
  return (
    <div className="flex-1 flex items-center gap-0.5 overflow-hidden">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="shrink-0 border-2 border-red-400/50 rounded-sm"
          style={{ width: 10, height: 7 }}
        />
      ))}
    </div>
  );
}

function FascistPowerIcon({ power }: { power: string }) {
  const cls = "text-red-300/80";
  if (power === "Peek") return <Eye size={14} className={cls} />;
  if (power === "Investigate") return <Search size={14} className={cls} />;
  if (power === "Special Election") return <Crown size={14} className={cls} />;
  if (power === "Execute") return <Skull size={14} className={cls} />;
  return null;
}

const POWER_LABELS: Record<string, string> = {
  Peek: "POLICY PEEK",
  Investigate: "INVESTIGATE",
  "Special Election": "SPECIAL ELECTION",
  Execute: "EXECUTION",
};

function getFascistPowers(playerCount: number): (string | null)[] {
  if (playerCount <= 6) return [null, null, "Peek", "Execute", "Execute", null];
  if (playerCount <= 8) return [null, "Investigate", "Special Election", "Execute", "Execute", null];
  return ["Investigate", "Investigate", "Special Election", "Execute", "Execute", null];
}
