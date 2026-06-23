import { NextRequest, NextResponse } from "next/server";
import { putBlob } from "@/lib/og/storageServer";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Body: { ciphertext: base64 }. Returns { ref, backend }. Ciphertext only. */
export async function POST(req: NextRequest) {
  try {
    const { ciphertext } = await req.json();
    if (typeof ciphertext !== "string" || !ciphertext) {
      return NextResponse.json({ error: "missing ciphertext" }, { status: 400 });
    }
    const { ref, backend } = await putBlob(ciphertext);
    return NextResponse.json({ ref, backend });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
