import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="font-display text-2xl">SafeGrow Invest</div>
            <p className="mt-3 text-sm opacity-80">
              Grow your money safely with transparent, time-locked investment plans paid in XAF.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider opacity-90">Platform</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/plans">Investment plans</Link></li>
              <li><Link to="/about">About us</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider opacity-90">Account</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/auth">Sign in</Link></li>
              <li><Link to="/dashboard">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider opacity-90">Contact</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li>Douala, Cameroon</li>
              <li>support@safegrowinvest.com</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex items-start gap-3 rounded-xl border border-white/15 bg-white/5 p-4 text-xs leading-relaxed opacity-90">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>
            <strong>Risk disclosure:</strong> Not a licensed financial institution.
            Investments carry risk. Only invest what you can afford to lose.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs opacity-60">
          © {new Date().getFullYear()} SafeGrow Invest. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
