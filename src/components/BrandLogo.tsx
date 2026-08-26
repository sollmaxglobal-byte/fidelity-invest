import { Link } from "@tanstack/react-router";

export function BrandLogo({ className = "", link = false }: { className?: string; link?: boolean }) {
  const logo = (
    <span className={`brand-logo ${className}`} role="img" aria-label="Fidelity Invest">
      <img src="/fidelity-logo.png" alt="" aria-hidden="true" />
    </span>
  );

  return link ? <Link to="/login">{logo}</Link> : logo;
}
