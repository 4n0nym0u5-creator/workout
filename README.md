# Tyson Push-Up

A mobile-first trainer for the Tyson push-up: a continuous squat-to-push-up. Learn the rep, run a session, and log the build toward 250 a day. Everything stays in the browser. There is no account and no backend.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm test          # plan math, streaks, backups
npm run build     # typecheck + static build in dist/
npm run preview   # serve the production build
```

## What’s in the app

- **Learn** — crouch, dive, bottom, and the snap back, with form cues, mistakes, muscles, the 9-week plan, easier and harder versions, and safety notes.
- **Demo** — the four trainer photos loop as one rep (crouch, dive, bottom, snap back), timed to the 1.5s / 1.75s / 2s / 3s tempo, with the phase name and cue on each beat. Switch to **Steps** to tap through and read the full cue. Swipe, the side arrows, or the left and right arrow keys.
- **Train** — today’s plan stage or a custom target. Tap to count, or a tempo pacer that counts, ticks, and (optionally) vibrates once per rep. Rest timer between sets, then a finish screen. You can also log a past day (yesterday or older) if a workout was not captured live.
- **Log** — sessions sync to **Postgres** (Neon or Supabase) via `/api/sync` when a connection URL is set on the Vercel project. The browser also keeps a local cache (`tyson-pushup-v1`) for offline use. Streaks, weekly totals, bests, progress toward 250, badges, home/progress charts, edit, delete, profile restore, and JSON export/import.
- **PWA** — installable, and the production build caches the app shell and photos for offline use.

## Database

1. In the Vercel dashboard, open the **tyson-pushup** project → **Storage** / **Integrations**.
2. Connect **Neon** or **Supabase** Postgres to **tyson-pushup** for Production + Preview.
3. Redeploy. `/api/health` should report `{ ok: true, database: true }`.
4. Open **Log** in the app to confirm cloud sync, and copy your profile id if you want the same log on another device.

The API reads `DATABASE_URL`, or falls back to Supabase’s `POSTGRES_PRISMA_URL` / `POSTGRES_URL`.

Local API testing:

```bash
npx vercel link --yes --scope 4n0nym0u5-creators-projects --project tyson-pushup
npx vercel env pull .env.local --yes
npx vercel dev
```

## Optional film

The photo loop is the demo. If you later add a full-rep video, drop it in as `public/demo.mp4` and rebuild. A **Film** control shows up on the demo and plays it in the same frame. With no file, that control is absent.

## Deploy

The app is a static Vite build. Routes use a hash (`/#/learn`) so any static host can serve it.

### Vercel

Import the repo. Framework preset: Vite. Build command: `npm run build`. Output: `dist`. `vercel.json` records the same settings.

### GitHub Pages

Project sites live under `/<repo>/`. Build with that base, then publish `dist`:

```bash
VITE_BASE=/workout/ npm run build
```

Use your repository name in place of `workout`. User sites at the domain root can use the default `npm run build`.

## Notes

Warm up, stop for sharp pain, and treat the plan as training guidance rather than medical advice. Teens should stay on the early stages. Wrist, shoulder, or back issues belong with a physio first.
