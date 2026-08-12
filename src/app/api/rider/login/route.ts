import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const { passcode } = (await req.json()) as { passcode?: unknown };
    const validPasscode = process.env.RIDER_PASSCODE || "1234";

    if (typeof passcode !== "string" || passcode.trim() !== validPasscode) {
      return NextResponse.json(
        { error: "Invalid Rider Passcode" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("rider_auth", "true", {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });

    return response;
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Login failed") },
      { status: 500 }
    );
  }
}
