import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Loads the SendPulse live chat widget site-wide.
 * Reads the chat id from app_settings.sendpulse_chat_id (admin-configured).
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
          .eq("id", 1)
          .maybeSingle();
        id =
          (data as { sendpulse_chat_id?: string } | null)?.sendpulse_chat_id
            ?.replace(/^["'\s]+|["'\s]+$/g, "")
            .trim() ?? "";
      } catch {
        return;
      }
      if (cancelled || !id) return;
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
