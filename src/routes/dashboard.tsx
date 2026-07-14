import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, TrendingUp, Wallet, User, Leaf, Menu, Info, Phone, Layers, FileText, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { SocialProof } from "@/components/SocialProof";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

type NavKey = "nav.home" | "nav.invest" | "nav.wallet" | "nav.profile";
type NavItem = { to: string; label: NavKey; icon: typeof Home; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/dashboard", label: "nav.home", icon: Home, exact: true },
  { to: "/dashboard/invest", label: "nav.invest", icon: TrendingUp },
  { to: "/dashboard/wallet", label: "nav.wallet", icon: Wallet },
  { to: "/dashboard/profile", label: "nav.profile", icon: User },
];

const SITE_MENU = [
  { to: "/", label: "Home", icon: Home },
  { to: "/plans", label: "Investment plans", icon: Layers },
  { to: "/about", label: "About us", icon: Info },
  { to: "/contact", label: "Contact", icon: Phone },
];

function DashboardLayout() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">{t("common.loading")}</div>;
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to : path.startsWith(to);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-semibold text-primary">SafeGrow</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <LanguageToggle />
            <ThemeToggle />
            {isAdmin && (
              <Button size="sm" variant="ghost" onClick={() => nav({ to: "/admin" })}>
                {t("nav.admin")}
              </Button>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="Open site menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="font-display text-primary">Site menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-4 flex flex-col gap-1">
                  {SITE_MENU.map((m) => (
                    <SheetClose asChild key={m.to}>
                      <Link
                        to={m.to as never}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted"
                      >
                        <m.icon className="h-4 w-4 text-primary" />
                        {m.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <div className="my-2 h-px bg-border" />
                  <div className="px-3 pt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Account</div>
                  {NAV.map((item) => (
                    <SheetClose asChild key={item.to}>
                      <Link
                        to={item.to as never}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted"
                      >
                        <item.icon className="h-4 w-4 text-primary" />
                        {t(item.label)}
                      </Link>
                    </SheetClose>
                  ))}
                  <SheetClose asChild>
                    <Link
                      to="/dashboard/deposit"
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted"
                    >
                      <FileText className="h-4 w-4 text-primary" />
                      Make a deposit
                    </Link>
                  </SheetClose>
                  <div className="my-2 h-px bg-border" />
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-3 py-4 sm:px-4 md:py-6">
        {/* Side nav (desktop) */}
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-20 flex flex-col gap-1">
            {NAV.map((item) => {
              const active = isActive(item.to, item.exact);
              return (
                <Link
                  key={item.to}
                  to={item.to as never}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {t(item.label)}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav (mobile) — app-style with active pill */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map((item) => {
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to as never}
                className="flex flex-col items-center justify-center gap-1 py-2 active:scale-95 transition-transform"
              >
                <span className={`flex h-9 w-12 items-center justify-center rounded-full transition ${
                  active ? "bg-primary text-primary-foreground shadow-elegant" : "text-muted-foreground"
                }`}>
                  <item.icon className="h-5 w-5" />
                </span>
                <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {t(item.label)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
