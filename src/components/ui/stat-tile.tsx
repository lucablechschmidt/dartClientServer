/** One figure of the statistics: small label above a big value (m8-plan §2). */
export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 flex-col rounded-tile bg-fill px-3 py-2">
      <span className="text-xs leading-tight text-fg-muted">{label}</span>
      <span className="truncate text-fluid-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}
