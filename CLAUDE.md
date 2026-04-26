# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start        # Start Expo dev server (opens QR code for Expo Go)
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator
```

No lint or test scripts are configured yet.

## Architecture

**Snipe** is a free-for-all mobile game where any player in a group can take a photo of any other player to "snipe" them and earn a point. Built with Expo (React Native + TypeScript) and Supabase.

### Stack
- **Expo SDK 54** with Expo Router v6 (file-based routing)
- **Supabase** — phone OTP auth, Postgres, Realtime, and Storage (snipe photos)
- Entry point: `index.ts` → `expo-router/entry` → `app/_layout.tsx`

### Routing structure
```
app/
  _layout.tsx           # Root: watches auth session, redirects to (auth) or (app)
  (auth)/
    index.tsx           # Phone number entry → sends SMS OTP
    verify.tsx          # OTP code + display name → completes signup
  (app)/
    index.tsx           # Home: list of games the user is in
    create-game.tsx     # Create a game and add friends by phone number
    game/[id].tsx       # Live leaderboard for a game + snipe button
    camera.tsx          # Camera view → take photo → upload snipe
```

### Auth flow
`app/_layout.tsx` calls `supabase.auth.getSession()` on mount and listens to `onAuthStateChange`. If unauthenticated, redirects to `/(auth)`; if authenticated, redirects to `/(app)`. No auth context/provider — session state lives directly in the root layout.

### Database schema (`supabase/migrations/001_initial_schema.sql`)
- `profiles` — extends `auth.users`, stores phone + display_name
- `games` — name, created_by, status (`active`/`ended`)
- `game_members` — join table with per-user score; score is auto-incremented by a Postgres trigger when a snipe is inserted
- `snipes` — photo_url, sniper_id, game_id

Key trigger: `on_snipe_created` → increments `game_members.score` for the sniper. Scores are never manually updated from the client.

### Realtime
`game/[id].tsx` subscribes to `INSERT` events on `snipes` filtered by `game_id` and re-fetches members when a new snipe lands, keeping the leaderboard live.

### Supabase client
`lib/supabase.ts` — single exported `supabase` instance using `AsyncStorage` for session persistence. Import from here everywhere; never create a second client.

### Environment variables
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (gitignored). Prefixed with `EXPO_PUBLIC_` so they're available in the React Native bundle via `process.env`.

## Supabase setup
Run the SQL in `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor to create all tables, triggers, RLS policies, and the `snipes` storage bucket.

Phone auth requires Twilio credentials configured under **Authentication → Providers → Phone** in the Supabase dashboard.
