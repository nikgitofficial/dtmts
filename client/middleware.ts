import { NextResponse, type NextRequest } from "next/server";

// Optimistic redirect only; the API is the real authority on every request.
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("at") || req.cookies.has("rt");
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/dashboard") && !hasSession) return NextResponse.redirect(new URL("/login", req.url));
  if ((pathname === "/login" || pathname === "/register") && req.cookies.has("at"))
    return NextResponse.redirect(new URL("/dashboard", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/dashboard/:path*", "/login", "/register"] };
