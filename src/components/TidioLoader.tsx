import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Loads the Tidio chat widget once the admin has saved a public key. */
export function TidioLoader() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("public_settings").select("tidio_public_key").maybeSingle();
      const key = data?.tidio_public_key?.trim();
      if (!key || cancelled) return;
      if (document.getElementById("tidio-script")) return;
      const s = document.createElement("script");
      s.id = "tidio-script";
      s.src = `//code.tidio.co/${key}.js`;
      s.async = true;
      document.body.appendChild(s);
    })();
    return () => { cancelled = true; };
  }, []);
  return null;
}
