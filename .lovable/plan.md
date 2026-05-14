# Plan

## 1. Promote `mokiawajovert@gmail.com` to admin
- Run a one-off SQL `INSERT` into `public.user_roles` selecting the user id from `auth.users` where email = `mokiawajovert@gmail.com`, role = `admin`, with `ON CONFLICT (user_id, role) DO NOTHING`.

## 2. Full English ↔ French translation across the entire site
Currently `useI18n` only covers a small set of dashboard/auth keys. Most pages (landing, plans, about, contact, footer, header, FAQ, admin, invest, profile, withdraw, forgot/reset password, all toasts) are hardcoded English.

- Expand the dictionary in `src/hooks/useI18n.tsx` to cover every visible string, grouped by namespace:
  - `landing.*` (hero, how-it-works, FAQ, CTA, disclaimer)
  - `header.*` / `footer.*`
  - `plans.*` (plan names stay, but labels: "Min", "Max", "Daily ROI", "Duration", "Activate")
  - `auth.*` (all labels, errors, forgot/reset flows)
  - `dashboard.home.*`, `dashboard.invest.*`, `dashboard.profile.*`
  - `withdraw.*` (extend existing)
  - `deposit.*` (rewrite for 4-step flow — see §4)
  - `admin.*` minimal (page titles, tab labels)
  - `toast.*` (success/error messages)
- Replace hardcoded strings in these files with `t("…")`:
  - `src/routes/index.tsx`, `plans.tsx`, `about.tsx`, `contact.tsx`
  - `src/components/SiteHeader.tsx`, `SiteFooter.tsx`
  - `src/routes/auth.tsx`, `forgot-password.tsx`, `reset-password.tsx`
  - `src/routes/dashboard.index.tsx`, `dashboard.invest.tsx`, `dashboard.profile.tsx`, `dashboard.wallet.tsx`, `dashboard.withdraw.tsx`, `dashboard.deposit.tsx`
  - `src/routes/admin.*.tsx` (titles + nav only)
- Switch is already instant via React context; verify by toggling language and confirming every page updates without reload.

## 3. Tidio live chat widget with test key
- Add a hardcoded fallback test key (e.g. `xyzabc12`) in `TidioLoader.tsx` that loads when no admin-saved `tidio_public_key` exists in `app_settings`.
- Mount `<TidioLoader />` in `src/routes/__root.tsx` so it shows site-wide (public + dashboard).
- Admin can later override via `admin.index.tsx` settings.

## 4. Redesign deposit page as a 4-step wizard
Rebuild `src/routes/dashboard.deposit.tsx` as a stepper with progress indicator. The four steps:

1. **Amount** — large numeric input with quick chips (10k / 25k / 50k / 100k XAF), live XAF formatting, min validation.
2. **Method** — card grid for active payment methods (MTN MoMo, Orange Money, etc.) with icon + label.
3. **Payment instructions** — shows account name, account number (copy buttons), the entered amount, and instructions. Confirms user has sent the money.
4. **Upload proof** — single file upload (screenshot only), preview thumbnail, submit button.

Behaviour:
- Sticky bottom "Continue / Back" buttons (mobile-first, app-like).
- Progress bar across top with step labels (translated).
- On submit → existing redirect to `/dashboard/wallet?filter=Deposits`.
- Keep current Supabase insert + storage upload + email notification logic untouched.

## Technical notes
- No DB schema changes (only the admin role insert).
- No new packages required.
- Tidio fallback key is public/test — safe to commit.
- All text strings flow through `t()` so language toggle works site-wide instantly.

## Files touched
- `src/hooks/useI18n.tsx` (large dictionary expansion)
- `src/components/TidioLoader.tsx` (fallback test key)
- `src/routes/__root.tsx` (mount TidioLoader)
- `src/routes/dashboard.deposit.tsx` (full rewrite as 4-step wizard)
- All pages listed in §2 (string replacement to `t()`)
- One SQL insert for the admin role
