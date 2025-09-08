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
