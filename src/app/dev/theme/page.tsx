import { ScoreGrid } from "@/components/darts/score-grid";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { de } from "@/i18n/de";

const TOKENS = [
  "bg", "fg", "fg-muted", "frame-bg", "frame-fg", "frame-text", "frame-active",
  "key-bg", "key-fg", "key-zero", "key-double", "key-triple", "key-undo",
  "hint-bg", "cricket-closed", "accent", "accent-soft", "accent-wash", "fill", "fill-strong", "on-accent", "scrim", "qr-bg",
];

/** Literal class names so Tailwind generates them; one per token in TOKENS. */
const SWATCH: Record<string, string> = {
  bg: "bg-bg", fg: "bg-fg", "fg-muted": "bg-fg-muted", "frame-bg": "bg-frame-bg", "frame-fg": "bg-frame-fg",
  "frame-text": "bg-frame-text", "frame-active": "bg-frame-active", "key-bg": "bg-key-bg", "key-fg": "bg-key-fg",
  "key-zero": "bg-key-zero", "key-double": "bg-key-double", "key-triple": "bg-key-triple", "key-undo": "bg-key-undo",
  "hint-bg": "bg-hint-bg", "cricket-closed": "bg-cricket-closed", accent: "bg-accent",
  "accent-soft": "bg-accent-soft", "accent-wash": "bg-accent-wash", fill: "bg-fill", "fill-strong": "bg-fill-strong",
  "on-accent": "bg-on-accent", scrim: "bg-scrim", "qr-bg": "bg-qr-bg",
};

const KEYS = [
  ["1", "2", "3", "4", "5"],
  ["6", "7", "8", "9", "10"],
  ["11", "12", "13", "14", "15"],
  ["16", "17", "18", "19", "20"],
  ["Bull", "0", "Undo", "Double", "Triple"],
];

const keyClass = (label: string) => {
  switch (label) {
    case "0": return "bg-key-zero";
    case "Undo": return "bg-key-undo";
    case "Double": return "bg-key-double";
    case "Triple": return "bg-key-triple";
    default: return "bg-key-bg";
  }
};

/** Gallery for docs/theme.md: tokens, both modes, layout grid. Reachable only in development (src/proxy.ts). */
export default function ThemeGallery() {
  return (
    <ScoreGrid
      header={
        <div className="flex items-center justify-between px-3 py-2">
          <span className="fluid-text-sm text-fg-muted">/dev/theme</span>
          <ThemeToggle labels={{ label: de.theme.label, system: de.theme.system, light: de.theme.light, dark: de.theme.dark }} />
        </div>
      }
      panels={
        <div className="grid h-full grid-rows-2 gap-2 px-3">
          {["Casey", "Sam"].map((name, i) => (
            <div
              key={name}
              className={`flex flex-col justify-between rounded-panel border-3 bg-frame-bg p-3 text-frame-text ${i === 0 ? "border-frame-active" : "border-frame-fg"}`}
            >
              <div className="flex justify-between fluid-text-lg">
                <span>{name}</span>
                <span className="tabular font-semibold">{i === 0 ? 321 : 501}</span>
              </div>
              <div className="flex gap-3 fluid-text-sm opacity-70">
                <span>🎯 {i === 0 ? 3 : 0}</span>
                <span className="tabular">{i === 0 ? "60.00" : "0.00"}</span>
              </div>
              <div className="flex justify-center gap-4 fluid-text-lg tabular">
                {(i === 0 ? ["T20", "T20", "T20"] : ["–", "–", "–"]).map((d, j) => (
                  <span key={j} className={j === 0 && i === 1 ? "border-b-2 border-frame-active" : ""}>{d}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      }
      hint={
        <div className="mx-3 rounded-full bg-hint-bg px-4 py-1 text-center fluid-text-sm text-on-accent">T20, T20, Bullseye</div>
      }
      keypad={
        <div className="grid h-full grid-cols-5 grid-rows-5 gap-1.5 px-3 pb-3">
          {KEYS.flat().map((label) => (
            <button
              key={label}
              type="button"
              className={`min-h-touch rounded-panel fluid-text-lg font-medium text-key-fg ${keyClass(label)}`}
            >
              {label}
            </button>
          ))}
        </div>
      }
    />
  );
}

export function TokenTable() {
  return (
    <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
      {TOKENS.map((t) => (
        <li key={t} className="flex items-center gap-2 fluid-text-sm">
          <span className={`inline-block size-8 rounded-box border border-frame-fg ${SWATCH[t]}`} />
          <code>--{t}</code>
        </li>
      ))}
    </ul>
  );
}
