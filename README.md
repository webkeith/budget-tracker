# Budget — Encrypted Personal Budget Tracker

A personal budget tracker with a dark, Apple-inspired UI. It syncs across devices through Supabase, signs in with Google, encrypts every detail on your device before it leaves it, hides sensitive numbers with one tap, and locks behind a PIN.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Radix / shadcn-style primitives · Framer Motion · Recharts · Supabase (Auth, Postgres, Realtime) · Web Crypto (AES-256-GCM) · Argon2id (vendored from hash-wasm in `lib/vendor/argon2.ts`) · Dexie (IndexedDB) · Zod · Vitest

---

## Quick start

```bash
npm install
cp .env.example .env.local   # leave the values empty for local-only mode
npm run dev                  # http://localhost:3000
```

**Two modes**

| Mode | When | What you get |
|---|---|---|
| **Local-only** | `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` empty | No sign-in. Vault, PIN, encryption, privacy mode, and clients all work. Encrypted data lives in this browser's IndexedDB only. |
| **Supabase** | Both env vars set | Google sign-in, encrypted sync across devices, realtime updates, account deletion. |

The first launch walks you through creating a vault passphrase, saving a recovery key, and setting a PIN. You then pick **Start fresh**, **Explore with sample data** (local only, never synced), or **Bring my existing data** (shown when the previous unencrypted version's data is found in this browser).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest: crypto, vault, PIN, backup, sync merge, sync engine (fake IndexedDB), clients/paydays, calculations |

---

## Supabase setup

### 1. Create the project and run the migration

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste `supabase/migrations/0001_init.sql`, and run it. Or with the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.

This creates:

- `profiles`: currency, locale, month start day. Plaintext, non-sensitive.
- `vaults`: the **wrapped** data key (by passphrase and by recovery key), salts, and KDF parameters.
- `records`: one row per item. `payload` is ciphertext. Only `id`, `collection`, `month`, `updated_at`, `deleted`, and a server `synced_at` are plaintext.
- Row Level Security on every table (`user_id = auth.uid()`).
- A trigger that creates a `profiles` row on signup.
- `upsert_records(rows jsonb)`: a last-write-wins batch upsert that runs as the caller (RLS applies, and `user_id` always comes from the JWT).
- `records` added to the `supabase_realtime` publication.

> `records.id` is `text` with primary key `(user_id, id)` rather than a bare `uuid`. This lets existing item IDs (and `nw-YYYY-MM` net-worth snapshots) sync unchanged without collisions between users.

### 2. Google OAuth client (Google Cloud Console)

1. **APIs & Services → OAuth consent screen**: set it up (External), add your app name and support email, and keep the default `email`, `profile`, `openid` scopes.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `https://your-domain.com`
4. **Authorized redirect URIs**: Google redirects to **Supabase**, not to your app:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`
5. Copy the **Client ID** and **Client secret**.

### 3. Supabase Auth configuration

1. **Authentication → Providers → Google**: enable it and paste the Client ID and secret.
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://your-domain.com` (use `http://localhost:3000` while developing).
   - **Redirect URLs**: add
     - `http://localhost:3000/auth/callback`
     - `https://your-domain.com/auth/callback`

The app uses the PKCE flow. `/auth/callback` exchanges the code for a cookie session, and `middleware.ts` refreshes it on every request.

### 4. Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server only, used by DELETE /api/account
```

- Never prefix the service role key with `NEXT_PUBLIC_`.
- Without the service role key, account deletion returns a clear "not configured" error and everything else still works.
- `NEXT_PUBLIC_*` values are inlined at build time, so rebuild after changing them.

---

## How the security works

### Keys

```
            passphrase ──Argon2id──► KEK ──AES-GCM wrap──┐
                                                         ├──► vaults row (server + local cache)
 recovery key (128-bit) ──HKDF──► KEK ──AES-GCM wrap─────┘
                                                         
 DEK (random 256-bit AES-GCM) ──encrypts──► every record payload (AAD = collection + id)

 On each trusted device only:
   device key (non-extractable, IndexedDB) ──wrap DEK──► inner
   Argon2id(PIN, device salt) ──wrap inner──► PIN wrapper (IndexedDB)
   [optional] WebAuthn passkey PRF ──HKDF──wrap inner──► biometric wrapper (IndexedDB)
```

- **DEK:** generated once per user. It stays in memory as a non-extractable `CryptoKey` while unlocked and is wiped on lock.
- **Passphrase:** at least 10 characters with a strength meter. Argon2id uses m = 19 MiB, t = 2, p = 1 (OWASP baseline) and falls back to PBKDF2-SHA256 with 600k iterations if WASM is unavailable. Parameters are stored with the vault, so they can be upgraded later.
- **Recovery key:** 128 random bits shown once in Crockford base32 (`XXXX-XXXX-…`), with copy and download. Unlocking with it forces you to set a new passphrase.
- **Changing the passphrase** only re-wraps the DEK. **New recovery key** rotates the recovery wrapper.
- **Record envelopes** are `{ v: 1, iv, ct }` with a fresh 12-byte IV per write. AAD binds each ciphertext to its row, so ciphertext can't be swapped between rows.
- Decrypted payloads are validated with Zod. Rows that fail are skipped and reported in the sync sheet. The app never crashes on them.

### PIN

- **4 or 6 digits, device-only.** The PIN never protects server data. Supabase only ever holds data wrapped by the passphrase and recovery key.
- The PIN wrapper needs both the PIN **and** the device's non-extractable key. A database dump can't be brute-forced with it.
- After **5 wrong PINs**, the PIN wrapper is deleted and the passphrase is required. The next unlock asks you to set a new PIN.
- No PIN hash is stored. A correct PIN is proven by a successful decryption.
- **Auto-lock** after 1, 5, 15, or 30 idle minutes, when you leave the tab (immediately or after 1, 5, or 15 minutes), and on every reload. Locking unmounts the data store and drops the DEK.
- **Biometric unlock** uses a platform passkey with the WebAuthn **PRF** extension. It only appears where supported, and turning it on requires your PIN.

### Privacy mode

- Toggle it with the eye button in the header or top bar, or press **H**.
- Every amount renders as `₱ ••••••`. Chart tooltips and the screen-reader summary are masked too.
- **Press and hold** any hidden amount to peek for 3 seconds.
- Per-device options: hide on launch, also hide percentages, and blur when the app goes to the background (on `visibilitychange` / `pagehide`).
- Implemented once in `Money`, `Pct`, `useFormatMoney`, `useCountUp`, and the chart components. No per-page code.

### Sync

- Each store change is diffed into per-record changes, encrypted, written to the local Dexie cache and the outbox, then pushed in batches through `upsert_records`.
- **Last write wins** per record by `updated_at`, enforced on the server. Deletes are soft tombstones, so they reach every device.
- **Pull** uses a server-assigned `synced_at` cursor (with a 5-second overlap), Realtime notifications, focus/visibility polling, and `online` events.
- **Offline:** changes queue in the outbox and push with exponential backoff (2–60 s).
- The status pill shows **Synced / Syncing… / Offline / Sync error / On this device / Sample data**. Tap it for details or **Sync now**.
- Signing out tries to push first. If changes are still pending, it asks before discarding them. Then it wipes the local encrypted cache, PIN wrapper, and keys.

### Content-Security-Policy and headers

`middleware.ts` sets a per-request nonce CSP:

- `script-src 'nonce-…' 'strict-dynamic' 'wasm-unsafe-eval'` (Argon2 WASM)
- `connect-src` limited to `'self'` and your Supabase URL (https + wss)
- `frame-ancestors 'none'`, `object-src 'none'`

`next.config.ts` adds HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`. There are no third-party scripts.

### Threat model

| Protected against | Not protected against |
|---|---|
| Database leaks, backups, or a curious Supabase admin: only ciphertext and wrapped keys are stored | XSS or a malicious browser extension running **while the app is unlocked** |
| A stolen locked device: needs the PIN *and* this browser profile's device key, with 5 attempts | Malware or a keylogger on your device capturing your passphrase or PIN |
| Network attackers: TLS, plus payloads are already encrypted | Someone who has your passphrase or recovery key |
| Shoulder-surfing and screen sharing: privacy mode and the background blur | A forgotten passphrase **and** a lost recovery key: data can't be recovered by anyone |

What stays visible on the server: which collections you use, row counts, months that have entries, timestamps, and your Google email and avatar.

### Recovery steps

1. **Forgot PIN:** choose *Use passphrase instead*, unlock, then set a new PIN.
2. **Forgot passphrase:** on the lock screen choose *Forgot passphrase? Use recovery key*, enter the key, then set a new passphrase and PIN.
3. **Lost the recovery key but still know the passphrase:** Settings → Security → *New recovery key*.
4. **New device:** sign in with Google, enter your passphrase (or recovery key), and set a PIN for that device.
5. **Lost both passphrase and recovery key:** your encrypted data can't be decrypted. Delete the account and start over, or restore an encrypted backup if you still know its passphrase.

### Backups

- **Settings → Your data → Export encrypted backup:** asks for your vault passphrase and writes a file encrypted with an Argon2id-derived key.
- **Export unencrypted** is available behind a warning.
- **Import** detects encrypted backups and asks for the passphrase they were made with. Plain JSON from v1 also imports and is encrypted on arrival.

---

## Clients (income sources)

Clients are long-lived income sources. The **Income** page has two views: **This month** and **Clients**.

| | Fixed clients | Hourly / variable clients |
|---|---|---|
| Amount | Per payout. Rate changes take effect from a chosen date. | None. Optional hourly rate for suggestions. |
| Schedules | Weekly (weekday) · Every 2 weeks (anchor date) · Twice a month (two days, default 15th and last day) · Monthly (day or last day) | Same |
| Each payday | **Expected** → one tap marks it **Received**. Turns **Overdue** after the payday passes. | **Needs amount** → *"How much did you receive from X for the week of …?"*, with hours, an "≈ ₱X at ₱Y/hr · Use this" hint, date received, and note. **Skip this period** records ₱0. |

- Paydays are counted **exactly** per month (4 or 5 weekly paydays; Feb 28/29 handled), never averaged as 52/12.
- Payouts are generated from the schedule on the fly and only written when you act on them. They're idempotent per `clientId + periodStart`, so two devices can never duplicate a payout.
- **Totals:** Income = Received + Expected fixed payouts not yet received + standalone income. Variable placeholders count as ₱0 until filled.
- **Reminders:** a dashboard and Income banner shows "N client payments to log" (last 35 days), and the insight line flags late fixed payouts.
- **Lifecycle:**
  - **Pause:** stops new payouts.
  - **Terminate:** end date, reason (Contract ended, Stopped paying, Project finished, Other), and note. You can keep or remove the unreceived payout that covers work up to the end date. The client moves to *Past clients* with an "Ended …" chip, and history stays.
  - **Reactivate:** sets a new start date.
- **Client detail:** totals, 3-month average payout, hours this month, a 6-month bar chart, payout history, and actions.
- **Quick-add** has a **Client** option. **Add income** lets you pick a client, which opens the log prompt for their next payday.
- **Copy to next month** never copies client payouts, because schedules generate them.

---

## Project structure (additions)

```
app/
  sign-in/page.tsx            Google sign-in
  auth/callback/route.ts      PKCE code exchange
  api/account/route.ts        DELETE: removes rows + auth user (service role)
middleware.ts                 Session refresh, auth redirects, nonce CSP
components/
  auth/                       google-button, account-card
  security/                   onboarding, lock-screen (+ needs-PIN / reset passphrase),
                              pin-keypad, pin-setup, passphrase-field, recovery-key-card,
                              privacy-toggle, privacy-overlay, legacy-import, secure-screen
  modules/clients/            card, form, parts (payout row, chips), sheets
                              (detail, log payment, payout, terminate, reactivate), pending-reminder
  layout/sync-status.tsx      Sync pill + details sheet
lib/
  supabase/{config,client,server}.ts
  crypto.ts                   AES-GCM envelopes, Argon2id/PBKDF2, HKDF, recovery-key codec
  vault.ts                    create / unlock (passphrase, recovery) / change / rotate
  pin.ts                      device key, PIN wrap, attempts + lockout
  biometric.ts                WebAuthn PRF unlock
  db.ts                       Dexie: records (ciphertext), outbox, meta
  remote.ts                   Supabase vault/profile/records + realtime
  sync-core.ts                diff / apply / LWW / Zod schemas (pure)
  sync.ts                     SyncEngine: encrypt, cache, outbox, push/pull, realtime
  security.tsx                Auth + vault + lock state machine, auto-lock
  privacy.tsx                 usePrivacy context
  clients.ts                  schedules, paydays, payouts, lifecycle (pure)
  backup.ts                   encrypted export/import
supabase/migrations/0001_init.sql
.env.example
```

`lib/calculations.ts` stays pure. Income totals now include client payouts. The v1 features (dashboard, payables, responsibilities, savings, investments, planning, assets) are unchanged apart from privacy-aware amounts.

## Deploying

Any Next.js host works (Vercel, Netlify, Docker). Set the three env vars, add your production domain to both the Google OAuth client and Supabase's redirect URLs, and serve over HTTPS. Web Crypto and passkeys require a secure context, and `localhost` counts as one.
