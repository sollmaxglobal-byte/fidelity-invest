import { Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/hooks/useI18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SocialProof } from "@/components/SocialProof";

export function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative hidden bg-hero p-12 text-primary-foreground md:flex md:flex-col md:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Leaf className="h-5 w-5" />
          </div>
          <span className="font-display text-2xl">Fidelity</span>
        </div>
        <div>
          <h2 className="font-display text-5xl">
            {t("auth.heroLine1")} <em className="not-italic text-success">{t("auth.heroLine2")}</em>.
          </h2>
          <p className="mt-4 max-w-md opacity-80">{t("auth.heroSub")}</p>
        </div>
        <p className="text-xs opacity-60">© Fidelity 2026</p>
      </div>

      {/* Right — content */}
      <div className="flex items-center justify-center bg-background p-6 md:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between">
            <Link to="/login" className="inline-flex items-center gap-2 md:invisible">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Leaf className="h-4 w-4" />
              </div>
              <span className="font-display text-xl text-primary">Fidelity</span>
            </Link>
            <LanguageToggle />
          </div>
          {children}
          <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
            {t("auth.disclaimer")}
          </p>
        </div>
      </div>
      <SocialProof />
    </div>
  );
}
