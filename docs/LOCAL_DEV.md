# Local Development Prerequisites

This project requires certain environment variables for the PDF analysis portal to run locally without 500 errors.

## Required

- OPENAI_API_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Create `.env.local` in the project root with:

```
# Portal
NEXT_PUBLIC_BRC_PORTAL_ENABLED=true
NEXT_PUBLIC_DEBUG_PORTAL=true

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-please-change

# OpenAI
OPENAI_API_KEY=sk-***

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...

# PDF thumbnails (optional, requires installing pdf-to-png-converter)
# NEXT_PUBLIC_PDF_THUMBS=on
```

## Optional: PDF Thumbnails
If you install `pdf-to-png-converter` locally, enable thumbnails by setting `NEXT_PUBLIC_PDF_THUMBS=on`. In serverless/preview environments, leave it unset/off to avoid native module issues.

### Native dependencies (macOS)
`pdf-to-png-converter` may require native PDF rendering libraries. On macOS, install Poppler:

```
brew install poppler
```

If native errors persist, keep thumbnails disabled (default) — OCR and analysis still work.

## Assistant route (dev) — handling ChunkLoadError

- `app/assistant/error.tsx` must be a Client Component (starts with `'use client';`). Keep it minimal and self-contained.
- If you see `ChunkLoadError` for `/_next/static/chunks/app/assistant/*.js` during development:
  1. Hard reload with cache disabled (Cmd/Ctrl+Shift+R)
  2. Bump `NEXT_PUBLIC_BUILD_ID` in `.env.local`, then restart `npm run dev`
  3. As a last resort: `rm -rf .next && npm run dev`

The assistant page root includes `data-build-id` so you can force a fresh chunk request by changing `NEXT_PUBLIC_BUILD_ID`.
