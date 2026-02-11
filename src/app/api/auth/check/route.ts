import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("blog-auth");

  return NextResponse.json({
    authenticated: auth?.value === "authenticated",
  });
}
