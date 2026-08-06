import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function AppInstallPrompt() {
  const { lang } = useI18n();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!prompt || dismissed) return null;

  const install = async () => {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setPrompt(null);
    else setDismissed(true);
  };

  return (
    <aside className="fixed inset-x-3 bottom-20 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-lg border border-gold/40 bg-card p-3 text-card-foreground shadow-elegant md:bottom-5">
      <img src="/fidelity-app-icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{lang === "fr" ? "Installer Fidelity" : "Install Fidelity"}</p>
        <p className="text-xs font-medium text-muted-foreground">
          {lang === "fr" ? "Accédez rapidement à votre compte depuis votre écran d’accueil." : "Open your account quickly from your home screen."}
        </p>
      </div>
      <Button size="icon" aria-label={lang === "fr" ? "Installer l’application" : "Install app"} onClick={install}>
        <Download className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" aria-label={lang === "fr" ? "Fermer" : "Dismiss"} onClick={() => setDismissed(true)}>
        <X className="h-4 w-4" />
      </Button>
    </aside>
  );
}