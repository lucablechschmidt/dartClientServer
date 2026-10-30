import { MinusIcon, PlusIcon } from "./icons";

type Props = {
  name: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  decreaseLabel: string;
  increaseLabel: string;
};

/** Number with − and + (Figma design: sets and legs); the value goes with the form in a hidden input. */
export function Stepper({ name, label, value, onChange, min = 1, max = 9, step = 1, disabled = false, decreaseLabel, increaseLabel }: Props) {
  const button = "grid min-h-touch min-w-touch place-items-center rounded-tile disabled:opacity-40";
  return (
    <div className={`flex items-center justify-between gap-1 ${disabled ? "opacity-60" : ""}`}>
      <input type="hidden" name={name} value={value} />
      <span className="whitespace-nowrap text-sm text-fg-muted">{label}</span>
      <span className="flex items-center">
        <button type="button" aria-label={`${label} ${decreaseLabel}`} disabled={disabled || value - step < min} onClick={() => onChange(value - step)} className={button}>
          <MinusIcon className="size-icon-sm" />
        </button>
        <span className="px-1 text-center text-lg font-semibold tabular" aria-live="polite">{value}</span>
        <button type="button" aria-label={`${label} ${increaseLabel}`} disabled={disabled || value + step > max} onClick={() => onChange(value + step)} className={`${button} bg-fill`}>
          <PlusIcon className="size-icon-sm" />
        </button>
      </span>
    </div>
  );
}
