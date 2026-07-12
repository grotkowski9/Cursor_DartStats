import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const NOINDEX_PREFIXES = ["/profile", "/m/", "/api/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPrivate = NOINDEX_PREFIXES.some(
    (p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p),
  );

  if (!isPrivate) return NextResponse.next();

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/profile", "/profile/:path*", "/m/:path*", "/api/:path*"],
};
