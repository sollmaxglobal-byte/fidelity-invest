// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import nodemailer from "npm:nodemailer@6.9.14";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function render(tpl: string, vars: Record<string, any>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  try {
    const body = await req.json();
    const { to, template_key, variables = {}, subject: customSubject, html: customHtml } = body ?? {};
    if (!to || (!template_key && !customHtml)) {
      return new Response(JSON.stringify({ error: "to and template_key (or html) required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Load settings
    const { data: settings } = await admin.from("app_settings").select("*").eq("id", 1).maybeSingle();
    if (!settings?.smtp_host || !settings?.smtp_user || !settings?.smtp_password) {
      return new Response(JSON.stringify({ error: "SMTP not configured. Open Admin → Settings to add SMTP credentials." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    let subject = customSubject as string | undefined;
    let html = customHtml as string | undefined;

    if (template_key) {
      const { data: tpl } = await admin.from("email_templates").select("*").eq("key", template_key).maybeSingle();
      if (!tpl) return new Response(JSON.stringify({ error: `Template ${template_key} not found` }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
      if (!tpl.enabled) return new Response(JSON.stringify({ ok: true, skipped: "disabled" }), { headers: { ...cors, "Content-Type": "application/json" } });
      const fullVars = { site_name: settings.site_name ?? "Camvcc", site_url: settings.site_url ?? "", ...variables };
      subject = render(tpl.subject, fullVars);
      html = render(tpl.html_body, fullVars);
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port ?? 465,
      secure: settings.smtp_secure ?? true,
      auth: { user: settings.smtp_user, pass: settings.smtp_password },
    });

    const fromName = settings.smtp_from_name || settings.site_name || "Camvcc";
    const fromEmail = settings.smtp_from_email || settings.smtp_user;

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: subject || "(no subject)",
        html: html || "",
      });
      await admin.from("email_logs").insert({ recipient: to, template_key: template_key ?? null, subject, status: "sent" });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    } catch (sendErr: any) {
      await admin.from("email_logs").insert({ recipient: to, template_key: template_key ?? null, subject, status: "failed", error: String(sendErr?.message ?? sendErr) });
      return new Response(JSON.stringify({ error: String(sendErr?.message ?? sendErr) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
