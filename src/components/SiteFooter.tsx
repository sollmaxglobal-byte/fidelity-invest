import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="font-display text-2xl text-gold">Camvcc</div>
          <p className="mt-3 text-sm opacity-80">
            Cameroonian capital growth — secure, transparent, daily returns in XAF.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">Platform</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li><Link to="/plans">Investment plans</Link></li>
            <li><Link to="/about">About us</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">Account</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li><Link to="/auth">Sign in</Link></li>
            <li><Link to="/dashboard">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">Contact</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li>Douala, Cameroon</li>
            <li>support@camvcc.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs opacity-60">
          © {new Date().getFullYear()} Camvcc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
