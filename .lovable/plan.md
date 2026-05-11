## Scope

Five connected changes across Camvcc:

1. **Dashboard look & feel** — dark/light theme toggle, app-like mobile UI (rounded cards, bottom tab dock, gradient header, larger touch targets).
2. **Tidio live chat** — admin pastes the public key in the admin panel; the widget loads site-wide once a key is saved.
3. **SMTP email** — admin configures host/port/user/password/from in the admin panel; emails are sent through a Supabase edge function using nodemailer.
4. **Email notifications + templates** — admin-editable templates with variables, auto-sent on:
   - Account created (Welcome)
   - Deposit submitted / approved / rejected
   - Withdrawal submitted / approved / paid / rejected
   - Investment started / completed
   - Password reset (template only — Lovable Cloud handles delivery for auth)
5. **Deposit form** — remove the required "transaction reference" field; only the payment screenshot is required (with amount + method).

## Database (one migration)

- `app_settings` (single row, id=1): tidio_public_key, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, smtp_from_name, smtp_from_email, site_name, site_url. Read: admin only. Public read view exposes only `tidio_public_key` + `site_name` to all users.
- `email_templates` (key, subject, html_body, enabled). Seeded with 8 templates listed above. Admin-only write; admin-only read.
- `email_logs` (to, template_key, status, error, created_at). Admin-only.
- `deposits.reference` → made nullable (kept for back-compat).

## Backend

- Edge function `send-email` (Deno + `npm:nodemailer`):
  - Auth: requires admin caller OR service-role secret header (so triggers work).
  - Input: `{ to, template_key, variables }`.
  - Loads SMTP from `app_settings`, renders template (`{{var}}` substitution), sends, writes to `email_logs`.
- Email triggers fired from existing client/admin code (deposits, withdrawals, investments, signup) — no DB triggers, keeping it simple and debuggable.

## Frontend

- **Theme**: `ThemeProvider` (localStorage + system), toggle in dashboard header and admin header. New `[data-theme="dark"]` tokens added to `src/styles.css`.
- **Dashboard layout** (`dashboard.tsx`):
  - Mobile: gradient hero header showing balance card, floating action row, large rounded bottom tab dock with active pill indicator.
  - Desktop: keeps sidebar, refined typography.
- **Deposit page**: drop "reference" field requirement; screenshot becomes required; cleaner mobile cards.
- **Admin → Settings** (new route `/admin/settings`): forms for Tidio key, SMTP config (with "Send test email" button), and site identity.
- **Admin → Email Templates** (new route `/admin/emails`): list + edit subject/html, toggle enabled, send test.
- **Tidio loader**: small component in `__root.tsx` that fetches the public settings view and injects the Tidio script when a key exists.

## Notes for the user

- **SMTP credentials**: you'll enter host/port/user/password in the admin Settings page after this ships. Common providers: Gmail (smtp.gmail.com:465 with an app password), Brevo/Sendinblue, Zoho, Mailgun SMTP, etc.
- **Tidio key**: get the project public key from your Tidio account → Settings → Channels → Live Chat → Installation.
- Auth emails (signup confirmation, password reset) are still delivered by Lovable Cloud's built-in system; the SMTP setup powers all the *app* notifications above.
