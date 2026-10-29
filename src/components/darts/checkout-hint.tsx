/** Port of CheckoutView: checkout suggestion or an equally tall placeholder so nothing jumps. */
export function CheckoutHint({ hint }: { hint: string | null }) {
  return (
    <div
      className={`mx-auto w-5/6 rounded-panel px-4 py-1 text-center fluid-text-sm text-white ${hint ? "bg-hint-bg" : "bg-transparent"}`}
      aria-live="polite"
    >
      {hint ?? " "}
    </div>
  );
}
