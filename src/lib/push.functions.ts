import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SubInput = { endpoint: string; p256dh: string; auth: string; userAgent?: string };

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: SubInput) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: context.userId,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.userAgent ?? null,
        },
        { onConflict: "endpoint" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { endpoint: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint)
      .eq("user_id", context.userId);
    return { ok: true };
  });

type Row = { id: string; endpoint: string; p256dh: string; auth: string };

async function deliver(rows: Row[], message: { title: string; body: string; url?: string; tag?: string }) {
  const { buildPushPayload } = await import("@block65/webcrypto-web-push");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const vapid = {
    subject: process.env["VAPID_SUBJECT"] ?? "mailto:support@fidelity.app",
    publicKey: process.env["VAPID_PUBLIC_KEY"],
    privateKey: process.env["VAPID_PRIVATE_KEY"],
  };
  if (!vapid.publicKey || !vapid.privateKey) throw new Error("Push keys are not configured");

  let sent = 0;
  const stale: string[] = [];

  await Promise.all(
    rows.map(async (row) => {
      try {
        const init = await buildPushPayload(
          { data: message, options: { ttl: 3600, urgency: "high" } },
          { endpoint: row.endpoint, expirationTime: null, keys: { auth: row.auth, p256dh: row.p256dh } },
          vapid,
        );
        const res = await fetch(row.endpoint, init as RequestInit);
        if (res.ok || res.status === 201) sent += 1;
        else if (res.status === 404 || res.status === 410) stale.push(row.endpoint);
      } catch (err) {
        console.error("[push] delivery failed", err);
      }
    }),
  );

  if (stale.length) await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
  return sent;
}

async function assertAdmin(context: { supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const sendPushBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { title: string; body: string; url?: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("push_subscriptions").select("id,endpoint,p256dh,auth");
    const sent = await deliver((rows ?? []) as Row[], {
      title: data.title,
      body: data.body,
      url: data.url || "/dashboard",
      tag: `broadcast-${Date.now()}`,
    });
    await supabaseAdmin.from("push_broadcasts").insert({
      title: data.title,
      body: data.body,
      url: data.url ?? null,
      created_by: context.userId,
      sent_count: sent,
    });
    return { sent, devices: (rows ?? []).length };
  });

export const sendPushToUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; title: string; body: string; url?: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("user_id", data.userId);
    const sent = await deliver((rows ?? []) as Row[], {
      title: data.title,
      body: data.body,
      url: data.url || "/dashboard/wallet",
      tag: `tx-${Date.now()}`,
    });
    return { sent };
  });
