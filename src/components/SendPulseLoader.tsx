import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Fallback SendPulse live chat ID. Admin can override via app_settings.sendpulse_chat_id.
const FALLBACK_SENDPULSE_ID = "demo";

/** Loads the SendPulse live chat widget site-wide. */
export function SendPulseLoader() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let id = FALLBACK_SENDPULSE_ID;
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("sendpulse_chat_id")
          .maybeSingle();
        const saved = (data as { sendpulse_chat_id?: string } | null)?.sendpulse_chat_id?.trim();
        if (saved) id = saved;
      } catch {
        // fall back
      }
      if (cancelled) return;
      if (document.getElementById("sendpulse-livechat-script")) return;
      const s = document.createElement("script");
      s.id = "sendpulse-livechat-script";
      s.src = "https://livechatv2.pulse.is/live-chat-loader-prod-iframe/loader.js";
      s.async = true;
      s.setAttribute("data-live-chat-id", id);
      document.body.appendChild(s);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
