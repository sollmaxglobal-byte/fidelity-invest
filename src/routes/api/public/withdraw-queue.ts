import { createFileRoute } from "@tanstack/react-router";

/**
 * MacroDroid polls this endpoint. It returns the next MTN withdrawal to pay,
 * with the ready-to-dial USSD code, or {"claimed":false} when there is nothing.
 */
async function handle(request: Request) {
  const { secretMatches } = await import("@/lib/deposit-verify.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { claimNext } = await import("@/lib/withdraw-auto.server");

  const url = new URL(request.url);
  let bodySecret: string | null = null;
  if (request.method === "POST") {
    try {
      const body = (await request.json()) as { secret?: string };
      bodySecret = typeof body?.secret === "string" ? body.secret : null;
    } catch {
      bodySecret = null;
    }
  }
  const provided =
    request.headers.get("x-mm-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("secret") ??
    bodySecret;

  const { data: settings } = await supabaseAdmin
    .from("app_settings")
    .select("mm_webhook_secret")
    .eq("id", 1)
    .maybeSingle();
  const expected = settings?.mm_webhook_secret ?? process.env["MM_SMS_WEBHOOK_SECRET"] ?? null;

  if (!expected || !secretMatches(provided || url.searchParams.get("secret") || bodySecret, expected)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const result = await claimNext();
    return Response.json(result);
  } catch (err) {
    console.error("[withdraw-queue] failed", err);
    return new Response(JSON.stringify({ error: "Could not read the queue" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/public/withdraw-queue")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
