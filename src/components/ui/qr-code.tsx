/** Shows a server-generated QR code (SVG string from `qrcode`). */
export function QrCode({ svg, label }: { svg: string; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="mx-auto w-56 max-w-full rounded-lg bg-white p-2 [&>svg]:h-auto [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
