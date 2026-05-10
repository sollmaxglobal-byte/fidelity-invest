import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/methods")({
  component: AdminMethods,
});

type Method = {
  id: string; type: "mobile_money" | "bank_transfer" | "crypto"; label: string;
  account_name: string | null; account_number: string | null; instructions: string | null; active: boolean;
};

function AdminMethods() {
  const [list, setList] = useState<Method[]>([]);

  async function load() {
    const { data } = await supabase.from("payment_methods").select("*").order("type");
    setList((data as Method[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("payment_methods").insert({
      type: fd.get("type") as Method["type"],
      label: String(fd.get("label")),
      account_name: String(fd.get("account_name") || ""),
      account_number: String(fd.get("account_number") || ""),
      instructions: String(fd.get("instructions") || ""),
      active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Method added");
    (e.target as HTMLFormElement).reset();
    load();
  }

  async function toggle(m: Method) {
    await supabase.from("payment_methods").update({ active: !m.active }).eq("id", m.id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this method?")) return;
    await supabase.from("payment_methods").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-primary md:text-4xl">Payment methods</h1>
        <p className="mt-1 text-sm text-muted-foreground">Channels users see at deposit.</p>
      </div>

      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
        <div>
          <Label>Type</Label>
          <select name="type" required className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="mobile_money">Mobile Money</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="crypto">Crypto</option>
          </select>
        </div>
        <div><Label>Label</Label><Input name="label" required placeholder="MTN Mobile Money" /></div>
        <div><Label>Account name</Label><Input name="account_name" required /></div>
        <div><Label>Account number / Phone / Wallet</Label><Input name="account_number" required /></div>
        <div className="sm:col-span-2"><Label>Instructions</Label><Textarea name="instructions" rows={3} /></div>
        <div className="sm:col-span-2">
          <Button type="submit" className="bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="mr-1 h-4 w-4" /> Add method
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        {list.map((m) => (
          <div key={m.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg text-primary">{m.label}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                    {m.type.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-1 text-sm">
                  <span className="text-muted-foreground">Account:</span> {m.account_name} •{" "}
                  <span className="font-mono">{m.account_number}</span>
                </div>
                {m.instructions && <p className="mt-1 text-xs text-muted-foreground">{m.instructions}</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <Switch checked={m.active} onCheckedChange={() => toggle(m)} />
                  {m.active ? "Active" : "Inactive"}
                </div>
                <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => remove(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
