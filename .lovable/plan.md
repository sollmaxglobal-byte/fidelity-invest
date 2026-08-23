# Offline mode with live sync

Goal: the app opens and stays usable without internet, then syncs with the server the moment the connection returns.

## What is genuinely possible (and what is not)

Money and accounts live on the server, so some things cannot be truly completed offline:

- **Create account / login offline** — not possible for a *new* device or a *new* account: the password is verified on the server. What we can do: once a user has logged in on the device, the session is remembered, so re-opening the app offline keeps them signed in for weeks without re-typing anything. A first-time signup or a login on a brand new device will show a clear "Connect to the internet to sign in" screen instead of a broken page.
- **Invest / deposit / withdraw offline** — the balance change must be validated by the server (otherwise a user could invest money they don't have, or withdraw twice). What we can do: let the user fill in and submit the request offline, store it safely on the device, show it as **Pending sync**, and send it automatically the second the phone is back online — then the real confirmation, receipt and push notification arrive.

So: everything is *viewable and operable* offline, and every action *completes* automatically on reconnection.

## What will be built

**1. Offline app shell**
The app itself (screens, icons, fonts, styles) is cached on the device, so it launches instantly with no internet, on both Android and iPhone. Uses the standard Lovable PWA setup so the cache never goes stale after an update.

**2. Cached live data**
Balance, active investments, plans, deposit/withdrawal history and referrals are saved on the device after each successful load. Offline, the dashboard shows the last synced figures with an "Offline — last updated 10:32" badge instead of empty cards or spinners. When back online, everything refreshes silently.

**3. Offline action queue**
Deposit submissions (including the payment screenshot), withdrawal requests and investment activations made offline are stored on the device in an outbox:
- The user gets an immediate "Saved — will be sent when you're back online" confirmation.
- The item appears in history marked **Pending sync**.
- On reconnect the app replays each item once, in order, with a unique key so nothing is submitted twice.
- Success turns it into a real transaction; a server rejection (e.g. insufficient balance) shows a clear message and removes it from the queue.

**4. Connection status**
A slim banner shows Offline / Syncing / Synced, plus a manual "Sync now" button in the profile page.

**5. Auth behaviour**
- Already logged in: full offline access to the dashboard.
- Not logged in and offline: friendly "You're offline — internet is needed to sign in or create an account" screen with a retry button.

## Technical notes

- `vite-plugin-pwa` (generateSW, `registerType: autoUpdate`, `NetworkFirst` for navigations, `CacheFirst` for hashed assets), registered from a guarded wrapper so it never activates in the Lovable preview or dev.
- The existing push worker logic is preserved by importing it into the generated `/sw.js`, so notifications keep working exactly as now.
- TanStack Query persistence to IndexedDB for cached reads (balance, investments, history, plans).
- Outbox stored in IndexedDB; screenshots kept as blobs and uploaded on replay. Replay is triggered by the `online` event and on app focus, guarded by an idempotency key per queued item so duplicates are impossible.
- No change to the money logic on the server: the same `request_withdrawal` / `activate_investment_v2` / deposit insert paths are used, just called later.

## Limits to be aware of

- Offline requests are **requests**, not instant balance changes — balances only move once the server accepts them.
- Offline mode works in the published app, not inside the Lovable editor preview.
