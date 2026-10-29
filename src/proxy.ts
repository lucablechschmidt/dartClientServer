import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/einladung", "/api/health"];

/**
 * /dev/* exists only in development. Everything else needs the session cookie (M3);
 * whether the session is valid is checked by the page (requireSession); there is no DB here.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/dev")) {
    return process.env.NODE_ENV === "production" ? new NextResponse(null, { status: 404 }) : NextResponse.next();
  }
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  if (request.cookies.has("darts_session")) return NextResponse.next();
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/|favicon\\.ico|icon\\.|apple-icon|manifest|robots\\.txt).*)"],
};
