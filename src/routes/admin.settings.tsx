import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, MessageCircle, Mail, Share2, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

type Settings = {
  id: number;
  site_name: string | null;
  site_url: string | null;
  tidio_public_key: string | null;
  sendpulse_chat_id: string | null;
  sendpulse_embed_html: string | null;
  tawk_property_id: string | null;
  tawk_widget_id: string | null;
  referral_percent: number | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_user: string | null;
  smtp_password: string | null;
  smtp_from_name: string | null;
  smtp_from_email: string | null;
  announcement_enabled: boolean | null;
  announcement_title: string | null;
  announcement_message: string | null;
  announcement_link: string | null;
  announcement_link_label: string | null;
  announcement_version: number | null;
};

function AdminSettings() {
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [reshow, setReshow] = useState(true);

  async function load() {
    // Full row (including SMTP credentials) is admin-only via SECURITY DEFINER RPC.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).rpc("get_app_settings_admin");
    const row = Array.isArray(data) ? data[0] : data;
    setS((row as Settings) ?? ({ id: 1 } as Settings));
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!s) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("app_settings").update({
        site_name: s.site_name ?? "Fidelity",
        site_url: s.site_url,
        tidio_public_key: s.tidio_public_key,
        sendpulse_chat_id: s.sendpulse_chat_id,
        sendpulse_embed_html: s.sendpulse_embed_html,
        tawk_property_id: s.tawk_property_id,
        tawk_widget_id: s.tawk_widget_id,
        referral_percent: s.referral_percent ?? 5,
        smtp_host: s.smtp_host,
        smtp_port: s.smtp_port,
        smtp_secure: s.smtp_secure,
        smtp_user: s.smtp_user,
        smtp_password: s.smtp_password,
        smtp_from_name: s.smtp_from_name,
        smtp_from_email: s.smtp_from_email,
        announcement_enabled: !!s.announcement_enabled,
        announcement_title: s.announcement_title,
        announcement_message: s.announcement_message,
        announcement_link: s.announcement_link,
        announcement_link_label: s.announcement_link_label,
        announcement_version: (s.announcement_version ?? 1) + (reshow ? 1 : 0),
      }).eq("id", 1);
      if (error) throw error;
      toast.success("Settings saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  if (!s) return <div className="text-muted-foreground">Loading…</div>;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-primary md:text-4xl">Site settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Branding, live chat & email.</p>
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg text-primary">Branding</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Site name</Label><Input value={s.site_name ?? ""} onChange={(e) => set("site_name", e.target.value)} /></div>
          <div><Label>Site URL</Label><Input value={s.site_url ?? ""} onChange={(e) => set("site_url", e.target.value)} placeholder="https://..." /></div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg text-primary">
          <Share2 className="h-5 w-5" /> Referral program
        </h2>
        <div className="max-w-xs">
          <Label>Referral commission (%)</Label>
          <Input
            type="number" min={0} max={100} step={0.5}
            value={s.referral_percent ?? 5}
            onChange={(e) => set("referral_percent", Number(e.target.value))}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Paid to referrer on every profit payout from their invitees.
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg text-primary">
          <MessageCircle className="h-5 w-5" /> Live chat widgets
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
              Tawk.to (recommended — supports file uploads)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Tawk Property ID</Label>
                <Input value={s.tawk_property_id ?? ""} onChange={(e) => set("tawk_property_id", e.target.value)}
                  placeholder="e.g. 65abc123def456…" />
                <p className="mt-1 text-xs text-muted-foreground">Tawk.to → Admin → Chat Widget → Property ID.</p>
              </div>
              <div>
                <Label>Tawk Widget ID</Label>
                <Input value={s.tawk_widget_id ?? ""} onChange={(e) => set("tawk_widget_id", e.target.value)}
                  placeholder="default" />
                <p className="mt-1 text-xs text-muted-foreground">Leave as "default" unless you have multiple widgets.</p>
              </div>
            </div>
          </div>
          <div>
            <Label>SendPulse Chat ID</Label>
            <Input value={s.sendpulse_chat_id ?? ""} onChange={(e) => set("sendpulse_chat_id", e.target.value)}
              placeholder="e.g. abc123…" />
            <p className="mt-1 text-xs text-muted-foreground">From SendPulse → Live Chat → Install.</p>
          </div>
          <div>
            <Label>Tidio public key</Label>
            <Input value={s.tidio_public_key ?? ""} onChange={(e) => set("tidio_public_key", e.target.value)}
              placeholder="Optional" />
            <p className="mt-1 text-xs text-muted-foreground">Leave empty to disable Tidio.</p>
          </div>
          <div className="sm:col-span-2">
            <Label>SendPulse full embed snippet (recommended)</Label>
            <Textarea
              className="min-h-[120px] font-mono text-xs"
              value={s.sendpulse_embed_html ?? ""}
              onChange={(e) => set("sendpulse_embed_html", e.target.value)}
              placeholder="<script ...></script>  — paste the exact code from SendPulse → Live Chat → Install"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              If filled, this is used instead of the Chat ID. Paste it exactly as SendPulse provides.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg text-primary">
          <Mail className="h-5 w-5" /> SMTP (transactional email)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Host</Label><Input value={s.smtp_host ?? ""} onChange={(e) => set("smtp_host", e.target.value)} /></div>
          <div><Label>Port</Label><Input type="number" value={s.smtp_port ?? 465} onChange={(e) => set("smtp_port", Number(e.target.value))} /></div>
          <div><Label>Username</Label><Input value={s.smtp_user ?? ""} onChange={(e) => set("smtp_user", e.target.value)} /></div>
          <div><Label>Password</Label><Input type="password" value={s.smtp_password ?? ""} onChange={(e) => set("smtp_password", e.target.value)} /></div>
          <div><Label>From name</Label><Input value={s.smtp_from_name ?? ""} onChange={(e) => set("smtp_from_name", e.target.value)} /></div>
          <div><Label>From email</Label><Input value={s.smtp_from_email ?? ""} onChange={(e) => set("smtp_from_email", e.target.value)} /></div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch checked={!!s.smtp_secure} onCheckedChange={(v) => set("smtp_secure", v)} />
            <span className="text-sm">Use TLS/SSL</span>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg text-primary">
          <Megaphone className="h-5 w-5" /> Popup notification
        </h2>
        <p className="text-xs text-muted-foreground">
          Shown once to every user. Save with “Show to everyone again” checked to re-display it after editing.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch
              checked={!!s.announcement_enabled}
              onCheckedChange={(v) => set("announcement_enabled", v)}
            />
            <span className="text-sm">Enable popup</span>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={s.announcement_title ?? ""} onChange={(e) => set("announcement_title", e.target.value)}
              placeholder="Join our official group" />
          </div>
          <div>
            <Label>Button label</Label>
            <Input value={s.announcement_link_label ?? ""} onChange={(e) => set("announcement_link_label", e.target.value)}
              placeholder="Join now" />
          </div>
          <div className="sm:col-span-2">
            <Label>Message</Label>
            <Textarea className="min-h-[100px]" value={s.announcement_message ?? ""}
              onChange={(e) => set("announcement_message", e.target.value)}
              placeholder="Write the announcement your users will see…" />
          </div>
          <div className="sm:col-span-2">
            <Label>Link (WhatsApp / Telegram / any URL)</Label>
            <Input value={s.announcement_link ?? ""} onChange={(e) => set("announcement_link", e.target.value)}
              placeholder="https://chat.whatsapp.com/…" />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch checked={reshow} onCheckedChange={setReshow} />
            <span className="text-sm">Show to everyone again on save</span>
          </div>
        </div>
      </section>

      <div className="sticky bottom-20 z-10 md:bottom-4">
        <Button onClick={save} disabled={busy} className="w-full bg-primary text-primary-foreground hover:opacity-90">
          <Save className="mr-2 h-4 w-4" /> {busy ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
