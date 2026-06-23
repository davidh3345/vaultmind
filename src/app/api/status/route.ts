import { NextResponse } from "next/server";
import { OG, isRouterReal, isStorageReal } from "@/lib/og/config";

export const runtime = "nodejs";

/** Tells the client whether real 0G is configured (drives the LOCAL DEV banner). */
export async function GET() {
  return NextResponse.json({
    network: OG.network,
    storage: isStorageReal(),
    router: isRouterReal(),
    model: OG.routerModel,
  });
}
