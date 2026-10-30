import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CricketSetup, EliminationSetup, SplitScoreSetup } from "@/components/screens/mode-setups";
import { X01Setup } from "@/components/screens/x01-setup";
import { MODE_IDS, type ModeId } from "@/domain/game";
import { de } from "@/i18n/de";
import { createMatchAction } from "@/server/match-actions";
import { createGuestAction } from "@/server/player-actions";
import { listPlayers } from "@/server/player-service";
import { requireSession } from "@/server/request";

const SETUPS = { x01: X01Setup, cricket: CricketSetup, elimination: EliminationSetup, splitscore: SplitScoreSetup };

async function Setup({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!(MODE_IDS as readonly string[]).includes(mode)) notFound();
  const { deps } = await requireSession();
  const ModeSetup = SETUPS[mode as ModeId];
  return (
    <ModeSetup
      players={listPlayers(deps)}
      texts={de.newGame}
      commonTexts={{ back: de.ui.back, save: de.players.save, cancel: de.players.cancel }}
      onStart={createMatchAction}
      onAddGuest={createGuestAction}
    />
  );
}

/** Setup per game mode (ClassicGameSetUpView and its siblings, M7). No tab bar, as in legacy; the title is in the shell. */
export default function NewMatchPage({ params }: { params: Promise<{ mode: string }> }) {
  return (
    <main className="flex min-h-dvh flex-col bg-bg-grouped pt-safe">
      <Suspense fallback={null}>
        <Setup params={params} />
      </Suspense>
    </main>
  );
}
