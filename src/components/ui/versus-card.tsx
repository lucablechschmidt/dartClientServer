import type { ReactNode } from "react";

/** One compared figure: the left and right player's value, the label between them. */
export type VersusRow = { label: string; left: string; right: string };

/**
 * Two players compared (victory screen 1 vs 1): names on top, the left one in the accent, an
 * optional big headline row (sets or legs), then one row per figure with the label in the middle.
 * A table, so screen readers read "Legs: 10, 6" by name.
 */
export function VersusCard({
  left,
  right,
  headline,
  rows,
  label,
}: {
  left: string;
  right: string;
  headline?: VersusRow;
  rows: VersusRow[];
  label: string;
}) {
  return (
    <div className="w-full rounded-panel bg-fill px-4 pb-1 text-fg">
      <table aria-label={label} className="w-full tabular-nums">
        <thead>
          <tr>
            <Cell as="th" side="left" accent className="pt-3 pb-2 font-semibold">
              {left}
            </Cell>
            <td aria-hidden />
            <Cell as="th" side="right" className="pt-3 pb-2 font-medium">
              {right}
            </Cell>
          </tr>
        </thead>
        <tbody>
          {headline && (
            <tr>
              <Cell side="left" accent className="py-2 text-fluid-xl font-bold">
                {headline.left}
              </Cell>
              <th scope="row" className="px-2 text-xs font-semibold tracking-widest whitespace-nowrap text-fg-muted uppercase">
                {headline.label}
              </th>
              <Cell side="right" className="py-2 text-fluid-xl font-bold">
                {headline.right}
              </Cell>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-separator">
              <Cell side="left" className="py-2.5 font-medium">
                {r.left}
              </Cell>
              <th scope="row" className="px-2 text-xs font-normal whitespace-nowrap text-fg-muted">
                {r.label}
              </th>
              <Cell side="right" className="py-2.5 font-medium">
                {r.right}
              </Cell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({
  as: Tag = "td",
  side,
  accent = false,
  className,
  children,
}: {
  as?: "td" | "th";
  side: "left" | "right";
  accent?: boolean;
  className: string;
  children: ReactNode;
}) {
  // the outer columns share the width the labels leave, so both sides stay the same size
  const align = side === "left" ? "w-1/2 text-left" : "w-1/2 text-right";
  return (
    <Tag scope={Tag === "th" ? "col" : undefined} className={`wrap-anywhere ${align} ${accent ? "text-accent" : ""} ${className}`}>
      {children}
    </Tag>
  );
}
