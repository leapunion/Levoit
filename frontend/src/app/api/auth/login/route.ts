import { NextRequest, NextResponse } from "next/server";

const CREDENTIALS = { username: "levoit", password: "Levoit@2026" };

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password } = body as {
    username: string;
    password: string;
  };

  if (username !== CREDENTIALS.username || password !== CREDENTIALS.password) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("levoit_session", "authenticated", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}
