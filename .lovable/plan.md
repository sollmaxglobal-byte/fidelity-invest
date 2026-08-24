# Fix the SMS forwarder app recommendation

The app previously listed (SMS to URL Forwarder by Bogomolov) was removed from the Play Store — it now only exists on F-Droid/GitHub. I'll switch the admin instructions to apps that are actually live on Google Play today, and make the webhook accept their payload formats.

## Recommended apps (verified live on Google Play)

1. **SMS Forwarder** (frzinapps) — 1M+ downloads, forwards SMS to a URL/webhook. Primary recommendation.
2. **Forward SMS** (Point Dume) — 100K+ downloads, forwards SMS to phone/email/Telegram/URL. Backup option.
3. **SMS to URL Forwarder** (F-Droid / GitHub APK) — kept only as an advanced fallback for anyone who prefers open source.

## What changes

- **Admin → Settings → Phone setup card**: replace the dead Play Store link with the two live apps above, each with its own step-by-step config (URL, method POST, headers, body template) plus the F-Droid fallback. Keep the copy buttons and battery-optimization checklist.
- **Webhook flexibility**: the current `/api/public/mm-sms` endpoint only accepts a strict `{"text","sender"}` JSON body. Play Store forwarders send different shapes (some send `message`/`from`, some send plain text, some allow only URL query params). I'll make the endpoint accept:
  - JSON with any of `text` / `message` / `body` / `msg` and `sender` / `from` / `number`
  - `application/x-www-form-urlencoded` bodies
  - plain-text bodies
  - secret via `x-mm-secret` header, `Authorization: Bearer`, or a `?secret=` query param (needed because some apps can't set custom headers)
- No change to matching or auto-approval logic — only how messages arrive.

## Technical notes

- `src/routes/api/public/mm-sms.ts`: content-type-aware parsing, alias field mapping, query-param secret support, unchanged constant-time secret comparison and 401/400 behaviour.
- `src/routes/admin.settings.tsx`: rewrite the Phone setup card content and links.
