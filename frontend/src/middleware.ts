import { NextRequest, NextResponse } from "next/server";

const UNPROTECTED = ["/login", "/api/auth/", "/_next/", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (UNPROTECTED.some((p) => pathname.startsWith(p))) {
    // Logged-in user visiting /login → redirect home
    if (
      pathname === "/login" &&
      request.cookies.get("levoit_session")?.value === "authenticated"
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Protected path without session → redirect to login (preserve original URL)
  if (request.cookies.get("levoit_session")?.value !== "authenticated") {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
