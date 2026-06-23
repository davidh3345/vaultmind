import { NextRequest, NextResponse } from "next/server";
import { getBlob } from "@/lib/og/storageServer";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Query: ?ref=...  Returns { ciphertext: base64 }. */
export async function GET(req: NextRequest) {
  try {
    const ref = req.nextUrl.searchParams.get("ref");
    if (!ref) return NextResponse.json({ error: "missing ref" }, { status: 400 });
    const ciphertext = await getBlob(ref);
    return NextResponse.json({ ciphertext });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
