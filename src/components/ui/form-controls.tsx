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

type TextButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: keyof typeof tones;
  /** No horizontal padding, for buttons in a wrapping row of actions. */
  flush?: boolean;
};

/** Text-only button (save, cancel, delete …). Defaults to type="button". */
export function TextButton({ tone = "accent", flush = false, type = "button", className = "", ...props }: TextButtonProps) {
  return (
    <button
      type={type}
      {...props}
      className={`min-h-touch shrink-0 ${flush ? "" : "px-2"} font-medium disabled:opacity-50 ${tones[tone]} ${className}`}
    />
  );
}

/** The one filled button of a screen (log in, join, try again). */
export function PrimaryButton({ type = "submit", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={`min-h-touch w-full rounded-box bg-accent font-semibold text-on-accent disabled:opacity-50 ${className}`}
    />
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
