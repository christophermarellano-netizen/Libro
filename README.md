# Libro

A Progressive Web App for reading Spanish EPUBs with an Apple Books-style library and tap-to-translate powered by DeepL.

## Features

- **Three library views**: cover grid, cover-flow carousel, and shelf overview with minimap
- **Physical book dimensions** resolved on import via Google Books (ISBN or title+author lookup)
- **Cover art** from EPUB, Google Books, or Open Library with spine colors extracted from covers
- **EPUB reader** with pagination, themes, font controls, and progress tracking
- **Tap-to-translate** any word while reading (requires DeepL API key)
- **PWA** installable with offline book storage

## Getting Started

```bash
npm install
npm run dev
```

Open the app, go to **Settings**, and add your [DeepL API key](https://www.deepl.com/pro-api) (free tier works for personal use).

## Import Books

Tap **+ Import** and select `.epub` files. Libro will:

1. **Open Library** (free) — physical dimensions from ISBN or title+author
2. **Google Books** — fallback if Open Library has no size data
3. **Amazon PA-API** (optional) — if you add Associates credentials in Settings
4. **Cover inference** — last resort from cover aspect ratio + page count
5. Extract a dominant color for the book spine

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS
- epub.js, Dexie.js, Framer Motion
- DeepL API, Google Books API

## Cloud sync (optional)

Libro can sync your library, reading progress, bookmarks, vocab, and settings across devices via [Supabase](https://supabase.com) (free tier works for personal use).

1. Create a Supabase project and run the migration in [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql) (SQL Editor or CLI).
2. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Deploy the DeepL proxy Edge Function:
   ```bash
   supabase functions deploy deepl-translate
   ```
4. In Supabase **Authentication → URL Configuration**, set:
   - **Site URL:** `https://libro-oy6l.vercel.app` (your production URL)
   - **Redirect URLs:** add both production and local dev:
     - `https://libro-oy6l.vercel.app/**`
     - `http://localhost:3000/**`
   - Set `VITE_APP_URL=https://libro-oy6l.vercel.app` in Vercel environment variables.
5. In Supabase **Authentication → Email Templates → Magic Link**, include the OTP token so users receive a 6-digit code, for example:
   ```
   Your Libro sign-in code: {{ .Token }}
   ```
   (You can keep a magic link in the same email as a fallback for desktop.)
6. Sign in via **Settings → Cloud Sync** on the live app, then enter the 6-digit code from your email.

Without Supabase, books stay in local IndexedDB. Use **Settings → Backup & Restore** to move your library manually.

## Build

```bash
npm run build
npm run preview
```
