import { supabase } from "@/integrations/supabase/client";

type Vars = Record<string, string | number | null | undefined>;

/** Fire-and-forget email send. Logs failures silently to console. */
export async function sendEmail(opts: {
  to: string;
  template_key: string;
  variables?: Vars;
}) {
  try {
    const { error } = await supabase.functions.invoke("send-email", {
      body: opts,
    });
    if (error) console.warn("[email] send failed:", error.message);
  } catch (e) {
    console.warn("[email] send threw:", e);
  }
}
