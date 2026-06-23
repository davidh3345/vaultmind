import { NextResponse } from "next/server";
import { OG, isRouterReal } from "@/lib/og/config";
import { storageRealReady } from "@/lib/og/storageServer";

export const runtime = "nodejs";

/** Tells the client whether real 0G is configured (drives the LOCAL DEV banner). */
export async function GET() {
  return NextResponse.json({
    network: OG.network,
    storage: await storageRealReady(), // key AND SDK present
    router: isRouterReal(),
    model: OG.routerModel,
  });
}
