import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/admin/plans")({
  component: AdminPlans,
});

type Plan = {
  id: string; name: string; description: string | null;
  min_amount: number; max_amount: number; daily_roi_percent: number; duration_days: number; active: boolean;
};

function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);

  async function load() {
    const { data } = await supabase.from("plans").select("*").order("min_amount");
    setPlans((data as Plan[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("plans").insert({
      name: String(fd.get("name")),
      description: String(fd.get("description") || ""),
      min_amount: Number(fd.get("min_amount")),
      max_amount: Number(fd.get("max_amount")),
      daily_roi_percent: Number(fd.get("daily_roi_percent")),
      duration_days: Number(fd.get("duration_days")),
      active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Plan created");
    (e.target as HTMLFormElement).reset();
    load();
  }

  async function toggle(p: Plan) {
    await supabase.from("plans").update({ active: !p.active }).eq("id", p.id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this plan?")) return;
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-primary md:text-4xl">Investment plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create and manage plans available to investors.</p>
      </div>

      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 md:grid-cols-3">
        <div><Label>Name</Label><Input name="name" required /></div>
        <div className="md:col-span-2"><Label>Description</Label><Input name="description" /></div>
        <div><Label>Min (XAF)</Label><Input name="min_amount" type="number" required min={0} /></div>
        <div><Label>Max (XAF)</Label><Input name="max_amount" type="number" required min={0} /></div>
        <div><Label>Daily ROI %</Label><Input name="daily_roi_percent" type="number" step={0.1} required min={0} /></div>
        <div><Label>Duration (days)</Label><Input name="duration_days" type="number" required min={1} /></div>
        <div className="sm:col-span-2 md:col-span-3">
          <Button type="submit" className="bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="mr-1 h-4 w-4" /> Add plan
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        {plans.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-display text-xl text-primary">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.description}</div>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div><div className="text-xs text-muted-foreground">Range</div><div>{formatXAF(p.min_amount)} – {formatXAF(p.max_amount)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Daily ROI</div><div>{p.daily_roi_percent}%</div></div>
                  <div><div className="text-xs text-muted-foreground">Duration</div><div>{p.duration_days} days</div></div>
                  <div><div className="text-xs text-muted-foreground">Total return</div><div>{(p.daily_roi_percent * p.duration_days).toFixed(1)}%</div></div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <Switch checked={p.active} onCheckedChange={() => toggle(p)} />
                  {p.active ? "Active" : "Inactive"}
                </div>
                <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => remove(p.id)}>
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
