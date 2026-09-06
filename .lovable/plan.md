# Professional mobile deposit flow (Zinc Minimal)

Rebuild the deposit experience using the approved "Zinc Minimal" direction: dark zinc surfaces, thin amber progress bar, big centred amount, rounded chips, and one bold amber action pinned at the bottom.

## The four screens

1. **Amount** — back button, "Deposit" title, 4-segment progress bar, centred FCFA amount card with the minimum shown underneath, and quick amount chips in a 3-column grid: **500, 1 000, 5 000, 10 000, 25 000, 50 000, 100 000, 250 000, 500 000**. Bottom row shows "Service fee — 0 XAF" above the Continue button.
2. **Payment method** — same shell; list of every active deposit method from the admin panel (MTN and Orange with their brand tiles, bank and crypto with their own icons), each as a tappable rounded row with a selected amber state.
3. **Transfer details** — amount, number to send to, and the account name, each with a copy button; countdown timer; "I have paid" as the bottom action.
4. **Proof + tracker** — tap-to-upload screenshot area with preview, then the submitted state (Uploaded → Verifying → Credited) and a button back to the dashboard.

## Behaviour

- Minimum and maximum deposit come from the admin settings instead of being fixed in the page.
- Each step fits one phone screen without scrolling; the bottom menu, chat bubble and install popup stay hidden through the whole flow.
- Back button steps backwards through the flow, then leaves to the dashboard.
- Amounts stay bold with spaced thousands (e.g. 50 000 FCFA).

## Technical notes

- Rewrite `src/routes/dashboard.deposit.tsx` around a shared step shell (header + progress + scrollless body + fixed footer), keeping the existing Supabase reads (`payment_methods`) and the existing insert into `deposits` with `payment_method_id` and `proof_url`.
- Read `deposit_min_amount` / `deposit_max_amount` from `app_settings` for validation and helper text.
- Container uses `h-[100dvh] overflow-hidden` with a `flex-1 min-h-0` body; keep framer-motion step transitions.
- Hide the floating widgets on `/dashboard/deposit` paths in the layout that mounts them.
