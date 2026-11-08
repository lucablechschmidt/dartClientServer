import { CheckIcon, ChevronDownIcon } from "./icons";

/* Small presentational parts of choice menus and their triggers (ChoiceMenu, ChoiceNumberField, setups, folding rows). */

/** The chevron of a choice trigger; points up while the list is open and turns there. */
export function DisclosureChevron({ open }: { open: boolean }) {
  return (
    <ChevronDownIcon
      className={`size-icon-sm shrink-0 motion-safe:transition-transform motion-safe:duration-base motion-safe:ease-ios ${open ? "rotate-180" : ""}`}
    />
  );
}

/** Small label above the chosen value, the content of most choice triggers (in rule / Single In). */
export function LabeledValue({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-1 flex-col">
      <span className="text-xs text-fg-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

/** The mark at the end of a choice: a filled check when chosen, an empty circle otherwise. */
export function ChoiceMark({ selected }: { selected: boolean }) {
  return selected ? (
    <span className="grid size-icon shrink-0 place-items-center rounded-full bg-accent text-on-accent">
      <CheckIcon className="size-icon-xs" />
    </span>
  ) : (
    <span className="size-icon shrink-0 rounded-full border-icon border-separator" />
  );
}
