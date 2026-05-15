import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, MessageCircle, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

type Settings = {
  id: number;
  site_name: string | null;
  site_url: string | null;
  tidio_public_key: string | null;
  sendpulse_chat_id: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_user: string | null;
  smtp_password: string | null;
  smtp_from_name: string | null;
  smtp_from_email: string | null;
};

function AdminSettings() {
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
    setS((data as Settings) ?? { id: 1 } as Settings);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!s) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("app_settings").update({
        site_name: s.site_name ?? "Camvcc",
        site_url: s.site_url,
        tidio_public_key: s.tidio_public_key,
        sendpulse_chat_id: s.sendpulse_chat_id,
        smtp_host: s.smtp_host,
        smtp_port: s.smtp_port,
        smtp_secure: s.smtp_secure,
        smtp_user: s.smtp_user,
        smtp_password: s.smtp_password,
        smtp_from_name: s.smtp_from_name,
        smtp_from_email: s.smtp_from_email,
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
          <MessageCircle className="h-5 w-5" /> Live chat widgets
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
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

      <div className="sticky bottom-20 z-10 md:bottom-4">
        <Button onClick={save} disabled={busy} className="w-full bg-primary text-primary-foreground hover:opacity-90">
          <Save className="mr-2 h-4 w-4" /> {busy ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
