import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Loads the SendPulse live chat widget site-wide.
 * Only injects the script when an admin has saved a real chat ID in
 * Admin → Settings (`app_settings.sendpulse_chat_id`).
 */
export function SendPulseLoader() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let id = "";
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("sendpulse_chat_id")
          .maybeSingle();
        id = (data as { sendpulse_chat_id?: string } | null)?.sendpulse_chat_id?.trim() ?? "";
      } catch {
        return;
      }
      if (cancelled) return;
      if (!id) return; // No widget until admin configures the chat ID
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
