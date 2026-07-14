import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Leaf } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { sendEmail } from "@/lib/email-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SocialProof } from "@/components/SocialProof";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SafeGrow Invest" },
      { name: "description", content: "Sign in or create your SafeGrow Invest account." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  full_name: z.string().min(2, "Enter your full name").max(80),
  phone: z.string().min(7).max(20),
  email: z.string().email(),
  password: z.string().min(8, "Min 8 characters").max(72),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function AuthPage() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      if (mode === "signup") {
        const v = signupSchema.parse({
          full_name: fd.get("full_name"),
          phone: fd.get("phone"),
          email: fd.get("email"),
          password: fd.get("password"),
        });
        const refCode = new URLSearchParams(window.location.search).get("ref") ?? "";
        const { error } = await supabase.auth.signUp({
          email: v.email,
          password: v.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: v.full_name, phone: v.phone, referral_code: refCode },
          },
        });
        if (error) throw error;
        sendEmail({ to: v.email, template_key: "welcome", variables: { name: v.full_name } });
        toast.success(t("auth.created"));
      } else {
        const v = loginSchema.parse({
          email: fd.get("email"),
          password: fd.get("password"),
        });
        const { error } = await supabase.auth.signInWithPassword({
          email: v.email,
          password: v.password,
        });
        if (error) throw error;
        toast.success(t("auth.welcomeToast"));
      }
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues[0].message : (err as Error).message;
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative hidden bg-hero p-12 text-primary-foreground md:flex md:flex-col md:justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Leaf className="h-5 w-5" />
          </div>
          <span className="font-display text-2xl">SafeGrow Invest</span>
        </Link>
        <div>
          <h2 className="font-display text-5xl">
            {t("auth.heroLine1")} <em className="not-italic text-success">{t("auth.heroLine2")}</em>.
          </h2>
          <p className="mt-4 max-w-md opacity-80">{t("auth.heroSub")}</p>
        </div>
        <p className="text-xs opacity-60">© SafeGrow Invest 2026</p>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center bg-background p-6 md:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between md:hidden">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Leaf className="h-4 w-4" />
              </div>
              <span className="font-display text-xl text-primary">SafeGrow Invest</span>
            </Link>
            <LanguageToggle />
          </div>
          <div className="hidden justify-end md:flex">
            <LanguageToggle />
          </div>
          <h1 className="font-display text-3xl text-primary">
            {mode === "login" ? t("auth.welcomeBack") : t("auth.createAcc")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? t("auth.signInSub") : t("auth.signUpSub")}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="full_name">{t("auth.fullName")}</Label>
                  <Input id="full_name" name="full_name" required maxLength={80} />
                </div>
                <div>
                  <Label htmlFor="phone">{t("auth.phone")}</Label>
                  <Input id="phone" name="phone" type="tel" required placeholder="+237 6XX XXX XXX" />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("auth.password")}</Label>
                {mode === "login" && (
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    {t("auth.forgot")}
                  </Link>
                )}
              </div>
              <Input id="password" name="password" type="password" required minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-primary text-primary-foreground hover:opacity-90">
              {busy ? t("common.pleaseWait") : mode === "login" ? t("auth.signIn") : t("auth.signUp")}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? t("auth.newHere") : t("auth.haveAccount")}{" "}
            <button
              className="font-medium text-primary underline underline-offset-4"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? t("auth.createOne") : t("auth.signIn")}
            </button>
          </div>

          <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
            {t("auth.disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}
