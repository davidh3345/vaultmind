import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { OG, isRouterReal } from "@/lib/og/config";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Body: { system, user }. Calls 0G Compute Router (OpenAI-compatible) when
 * configured; otherwise returns a clearly-labeled local-dev extractive answer.
 * The Router key stays server-side.
 */
export async function POST(req: NextRequest) {
  try {
    const { system, user } = await req.json();
    if (typeof user !== "string") {
      return NextResponse.json({ error: "missing prompt" }, { status: 400 });
    }

    if (isRouterReal()) {
      const client = new OpenAI({ baseURL: OG.routerBase, apiKey: OG.routerKey });
      const res = await client.chat.completions.create({
        model: OG.routerModel,
        messages: [
          { role: "system", content: String(system || "") },
          { role: "user", content: user },
        ],
        temperature: 0.2,
      });
      const answer = res.choices[0]?.message?.content?.trim() || "…";
      return NextResponse.json({
        answer,
        meta: { mode: "router", level: "infra", model: OG.routerModel, network: OG.network },
      });
    }

    // Local-dev fallback: surface the top context block, clearly labeled.
    const ctx = user.split("\n\nQuestion:")[0].replace(/^Context:\s*/, "");
    const top = ctx.split(/\n\n\[/)[0].slice(0, 400).trim();
    return NextResponse.json({
      answer:
        "⚠️ Local dev — 0G Router not configured (set ZG_ROUTER_API_KEY). Closest passage from your documents:\n\n" +
        top,
      meta: { mode: "local-dev", level: "infra", model: "(none)", network: OG.network },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
