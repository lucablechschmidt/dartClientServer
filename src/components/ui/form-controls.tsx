import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/**
 * Form building blocks shared by every screen (architecture.md §9, DRY). Screens never repeat
 * input or button classes; a new variant is added here.
 */

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** In a row next to buttons (grows, may shrink) instead of full width under a label. */
  inline?: boolean;
};

export function TextInput({ inline = false, className = "", ...props }: TextInputProps) {
  const width = inline ? "min-w-0 flex-1" : "w-full";
  return (
    <input {...props} className={`min-h-touch ${width} rounded-box border border-separator bg-transparent px-3 text-fg ${className}`} />
  );
}

const tones = { accent: "text-accent", danger: "text-key-undo", muted: "text-fg-muted" } as const;

/** While its action runs (useAsyncAction): disabled and announced as busy (R-16). */
type Pending = { pending?: boolean };
const pendingProps = (pending: boolean, disabled: boolean | undefined) => ({
  disabled: pending || disabled,
  "aria-busy": pending || undefined,
});

type TextButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  Pending & {
    tone?: keyof typeof tones;
    /** No horizontal padding, for buttons in a wrapping row of actions. */
    flush?: boolean;
  };

/** Text-only button (save, cancel, delete …). Defaults to type="button". */
export function TextButton({
  tone = "accent",
  flush = false,
  type = "button",
  pending = false,
  disabled,
  className = "",
  ...props
}: TextButtonProps) {
  return (
    <button
      type={type}
      {...props}
      {...pendingProps(pending, disabled)}
      className={`min-h-touch shrink-0 ${flush ? "" : "px-2"} font-medium disabled:opacity-50 ${tones[tone]} ${className}`}
    />
  );
}

/**
 * Full-width buttons: `primary` the one filled button of a screen (log in, join, play again),
 * `outline` a second choice in the accent, `secondary` a gray one (undo, statistics), `quiet` text only
 * (back to the start page).
 */
const buttonVariants = {
  primary: "bg-accent font-semibold text-on-accent",
  outline: "border border-accent font-semibold text-accent",
  secondary: "bg-fill font-medium text-fg",
  quiet: "text-fg-muted",
} as const;
export type ButtonVariant = keyof typeof buttonVariants;
const buttonClass = (variant: ButtonVariant, className: string) =>
  `inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-box px-4 disabled:opacity-50 ${buttonVariants[variant]} ${className}`;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & Pending & { variant?: ButtonVariant };

/** A full-width button in one of the variants; defaults to type="button". */
export function Button({ variant = "secondary", type = "button", pending = false, disabled, className = "", ...props }: ButtonProps) {
  return <button type={type} {...props} {...pendingProps(pending, disabled)} className={buttonClass(variant, className)} />;
}

/** The one filled button of a screen (log in, join, try again); defaults to type="submit". */
export function PrimaryButton({ type = "submit", ...props }: Omit<ButtonProps, "variant">) {
  return <Button {...props} type={type} variant="primary" />;
}

/** A link that looks like a full-width button (to the tournament, to the statistics). */
export function ButtonLink({
  href,
  variant = "secondary",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

/** Label above a full-width input. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex w-full flex-col gap-1 text-sm text-fg-muted">
      {label}
      {children}
    </label>
  );
}

/** Error line under a form or row; announced by screen readers. */
export function FormError({ children, centered = false }: { children: ReactNode; centered?: boolean }) {
  return (
    <p role="alert" className={`pt-1 text-sm text-key-undo ${centered ? "text-center" : ""}`}>
      {children}
    </p>
  );
}

/** Quiet success line (`account.saved`). */
export function FormNote({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="pt-1 text-sm text-fg-muted">
      {children}
    </p>
  );
}

/** Small uppercase heading above a CardList (e.g. today's guests). */
export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="px-4 text-sm tracking-wide text-fg-muted uppercase">{children}</h2>;
}

/** The error of one row, if any, with its text from a map of error texts (e.g. `account.errors`). */
export function ErrorLine<E extends string>({ error, texts }: { error: E | undefined; texts: Record<E, string> }) {
  return error ? <FormError>{texts[error]}</FormError> : null;
}
