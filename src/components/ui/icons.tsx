import type { SVGProps } from "react";

/**
 * The legacy app's SF Symbols as thin line icons (1.5 px). Size via `className` (h-/w-),
 * color via `currentColor`. All are decorative (aria-hidden); the text sits on the button.
 */
type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

/** chevron.left.circle */
export function ChevronLeftCircleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9.5" />
      <polyline points="13.5 8 9.5 12 13.5 16" />
    </svg>
  );
}

/** circle */
export function CircleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9.5" />
    </svg>
  );
}

/** checkmark.circle */
export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9.5" />
      <polyline points="7.5 12.5 10.5 15.5 16.5 9" />
    </svg>
  );
}

/** wrench */
export function WrenchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14.7 6.3a4 4 0 0 0-5.1 5.1L4 17l3 3 5.6-5.6a4 4 0 0 0 5.1-5.1l-2.4 2.4-2.1-.6-.6-2.1z" />
    </svg>
  );
}

/** gamecontroller */
export function GameControllerIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 7h10a4 4 0 0 1 4 4l.5 4a2.5 2.5 0 0 1-4.3 1.7L15.5 15h-7l-1.7 1.7A2.5 2.5 0 0 1 2.5 15L3 11a4 4 0 0 1 4-4z" />
      <line x1="8" y1="10" x2="8" y2="13" />
      <line x1="6.5" y1="11.5" x2="9.5" y2="11.5" />
      <circle cx="16" cy="11" r="0.6" fill="currentColor" />
      <circle cx="18" cy="12.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

/** person */
export function PersonIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0z" />
    </svg>
  );
}

/** person.crop.circle (account tab) */
export function PersonCircleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="10" r="3.2" />
      <path d="M5.8 18.5a7 7 0 0 1 12.4 0" />
    </svg>
  );
}

/** xmark.circle (abort game) */
export function XmarkCircleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9.5" />
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
      <line x1="15.5" y1="8.5" x2="8.5" y2="15.5" />
    </svg>
  );
}

/** circle.slash (average in the player panel) */
export function CircleSlashIcon(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.8, ...props })}>
      <circle cx="12" cy="12" r="9" />
      <line x1="5.6" y1="18.4" x2="18.4" y2="5.6" />
    </svg>
  );
}

// Setup screens (Figma design, M7 follow-up)

/** chevron.down (choice menus) */
export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <polyline points="6 9.5 12 15.5 18 9.5" />
    </svg>
  );
}

/** checkmark */
export function CheckIcon(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 2.2, ...props })}>
      <polyline points="5.5 12.5 10 17 18.5 7.5" />
    </svg>
  );
}

/** target (start score card) */
export function TargetIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

/** iphone (input mode) */
export function PhoneIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <line x1="10.5" y1="18.5" x2="13.5" y2="18.5" />
    </svg>
  );
}

/** person.badge.plus (add guest) */
export function PersonPlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 19.5a6.5 6.5 0 0 1 11.5-4" />
      <line x1="18.5" y1="14" x2="18.5" y2="20" />
      <line x1="15.5" y1="17" x2="21.5" y2="17" />
    </svg>
  );
}

/** arrow.right (start game) */
export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 2, ...props })}>
      <line x1="4.5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  );
}

/** minus / plus (stepper) */
export function MinusIcon(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 2, ...props })}>
      <line x1="6" y1="12" x2="18" y2="12" />
    </svg>
  );
}
export function PlusIcon(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 2, ...props })}>
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="12" y1="6" x2="12" y2="18" />
    </svg>
  );
}
