# Dream Team FC

A data-tracking site for one FIFA 27 club. Anyone can view results and player
stats; 1–3 admins enter matches after a game, usually from a phone.

Next.js (App Router) + TypeScript + Tailwind on Vercel, Supabase (Postgres +
Auth) for data and login, no ORM.

---

## Setup checklist

### 1. Create the Supabase project

<https://supabase.com/dashboard> → **New project**. Note the project ref (the
subdomain of your project URL).

### 2. Turn off new user signups

**Authentication → Sign In / Providers → Email**: turn **Allow new users to
sign up** off. There is no sign-up page in this app, and this closes the API
route too.

### 3. Create 1–3 users

**Authentication → Users → Add user → Create new user**. Set an email and
password for each admin. Tick "Auto Confirm User".

### 4. Run the migration

Either with the CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

…or by pasting `supabase/migrations/0001_init.sql` into the **SQL Editor** and
running it. It creates every table, the RLS policies, `is_admin()`,
`save_match()`, the `updated_at` trigger, and seeds the three starting game
types (League, Playoff, Promotion). It seeds no seasons.

### 5. Make those users admins

In the SQL editor, with your own addresses:

```sql
insert into admins (user_id)
select id from auth.users where email in ('you@example.com');
```

There is no client write policy on `admins` — this is the only way in, on
purpose.

### 6. Set the environment variables

Copy `.env.example` to `.env.local` and fill in both values from
**Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>
```

These two are the only env vars the app has. There is no service-role key
anywhere: every write goes through a server action using the signed-in user's
session, so Postgres RLS is the real enforcement.

### 7. Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Sign in at `/login`, then add a season under
**Seasons**, a roster under **Players**, and your first match.

Optional sample data for local work only:

```bash
psql "<your connection string>" -f supabase/seed.sql
```

Everything in that file is prefixed `FAKE`. Do not run it against the real
project.

### 8. Deploy to Vercel

Import the repo at <https://vercel.com/new>, set the same two env vars for
Production (and Preview if you want it), and deploy. No other configuration is
needed.

### 9. Attach the custom domain

Vercel → the project → **Settings → Domains → Add**. Add the apex and/or `www`
and follow the DNS records Vercel shows (an `A` record for the apex, a `CNAME`
for `www`). Then, in Supabase under **Authentication → URL Configuration**, set
the Site URL to the custom domain.

---

## Adding a new tracked stat

Shots, yellow cards, saves and so on. Two steps:

1. **One migration.** Add a column with a `not null default 0`:

   ```sql
   -- supabase/migrations/0002_add_shots.sql
   alter table match_player_stats
     add column shots int not null default 0 check (shots >= 0);
   ```

   Run it (`supabase db push` or the SQL editor).

2. **One config entry** in `lib/stats-config.ts`:

   ```ts
   export const STATS: StatConfig[] = [
     { key: 'goals', label: 'Goals', shortLabel: 'G' },
     { key: 'assists', label: 'Assists', shortLabel: 'A' },
     { key: 'shots', label: 'Shots', shortLabel: 'SH' },
   ]
   ```

The match entry form, the match detail table, the leaderboard and the player
pages all render from that array, and the queries select their stat columns
from it, so nothing else changes. Aggregation happens in TypeScript
(`lib/aggregate.ts`) — there are deliberately no SQL views to keep in sync.

Then refresh the types (step below) so `lib/database.types.ts` knows about the
new column.

## Regenerating the database types

`lib/database.types.ts` is currently hand-written to match
`supabase/migrations/0001_init.sql`. Regenerate it after any migration:

```bash
supabase gen types typescript --project-id <your-project-ref> --schema public > lib/database.types.ts
```

or, against a local stack:

```bash
supabase gen types typescript --local --schema public > lib/database.types.ts
```

---

## How it is put together

```
app/
  page.tsx                      dashboard
  matches/                      history list + match detail
  players/                      leaderboard + player detail
  login/                        email + password sign-in (no sign-up)
  admin/                        match entry, roster, seasons, game types
  auth-actions.ts               sign in / sign out server actions
components/
  MatchForm.tsx                 the match entry screen (new + edit share it)
  PlayersTable.tsx              sortable leaderboard
  TopNav.tsx, Wordmark.tsx, ui.tsx
lib/
  supabase/client.ts            browser client
  supabase/server.ts            server client bound to the user's cookies
  supabase/proxy.ts             session refresh + /admin/* guard
  stats-config.ts               the tracked per-player stats
  aggregate.ts, queries.ts, format.ts, auth.ts, constants.ts
  database.types.ts
proxy.ts                        Next.js 16's renamed middleware
supabase/migrations/0001_init.sql
supabase/seed.sql               FAKE dev-only sample data
```

### Auth and authorization

- `proxy.ts` refreshes the auth cookie on every request. For `/admin/*` it
  redirects a signed-out visitor to `/login`, and **signs out** a signed-in user
  who is not in `admins`, sending them to `/login?error=not_authorized` which
  shows "Not authorized".
- `app/admin/layout.tsx` re-checks admin status server-side, and every server
  action calls `requireAdmin()` before touching the database.
- Admin buttons only render for admins, but that is cosmetic — RLS is what
  actually stops a write.

### Saving a match

Both create and edit call the `save_match(p_match jsonb, p_stats jsonb)`
function, which inserts or updates the match and replaces all of its
`match_player_stats` rows in one transaction. It is `security invoker`, so the
caller's RLS applies. Deleting a match is a plain delete; the stats cascade.

### The saving rule for stats

A row is always written for every **human** player who played, even at 0 goals
and 0 assists — that is how games played is counted. AI teammates only get a
row when they actually scored or assisted, so games played and per-game
averages show "—" for them.

### Dates

`played_on` is a plain SQL `date` and is handled everywhere as a `'YYYY-MM-DD'`
string. `lib/format.ts` formats it by splitting the string, never by
constructing a `Date`, which would shift the day for anyone west of UTC.

---

## Decisions made where the brief left it open

- **Next.js 16** is what `create-next-app` installs today, so middleware lives
  in `proxy.ts` (its new name) and `params` / `searchParams` are awaited.
  Tailwind v4 is configured from `app/globals.css` rather than a JS config.
- **Filters** on `/matches` are plain query-string parameters on a GET form, so
  a filtered view is a shareable URL and works without JavaScript. Season/type
  selects auto-submit; the opponent search submits on Enter or "Apply".
- **Filtering and sorting happen in the browser/server memory**, not in SQL.
  The whole match history is a few hundred rows at most. Supabase's default
  1000-row response cap is the ceiling; if the club ever gets near it, move the
  filters into the queries in `lib/queries.ts`.
- **Player deletion**: the button reads "Delete" for a player with no recorded
  stats and "Deactivate" for one who has any, and the action re-checks
  server-side, so a player with history can never be hard-deleted.
- **"Link to my login"** clears any previous link for the signed-in admin first,
  since `players.user_id` is unique.
- **Top scorers/assisters** on the dashboard, the leaderboard columns and the
  per-season breakdown are all generated from `lib/stats-config.ts`, so a new
  stat appears in all of them automatically.
- **Result auto-suggestion** follows the scores, or the PK scores when both are
  filled in; level scores with no PK scores suggest `D`. Touching the W/D/L
  buttons pins your choice, and the stored value is always what is shown.
- **Sign-out** is in the nav for admins; visitors see an "Admin" link instead.

## Scripts

```bash
npm run dev        # local dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## Not built, on purpose

Live data, multiple clubs, public signups, CSV import, an opponents table.
