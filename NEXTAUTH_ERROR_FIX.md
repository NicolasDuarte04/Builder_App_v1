# NextAuth CLIENT_FETCH_ERROR Fix

## Error
The error `CLIENT_FETCH_ERROR: The string did not match the expected pattern` typically occurs when:
1. NEXTAUTH_URL is not properly set
2. Google OAuth credentials are missing or invalid
3. Network timeout issues with OAuth providers

## Changes Made

### 1. Updated NextAuth Configuration (`src/app/api/auth/[...nextauth]/route.ts`)
- Added timeout configuration for Google OAuth provider (10 seconds)
- Added error page redirect
- Added debug mode for development
- Added explicit secret configuration
- Made client ID and secret fallback to empty string instead of throwing

### 2. Created Test Routes
- `/api/test-env` - Check if environment variables are set
- `/api/auth/test-session` - Test session functionality

## Required Environment Variables

Make sure your `.env.local` file contains:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Supabase (if using)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## To Test
1. Visit `/api/test-env` to check if all environment variables are loaded
2. Visit `/api/auth/test-session` to check session status
3. If authentication is not critical for testing insurance cards, you can access `/assistant` directly

## Note
The timeout errors with Google OAuth suggest network connectivity issues. The 10-second timeout should help, but if the problem persists, consider:
- Checking your internet connection
- Verifying Google OAuth credentials are correct
- Ensuring NEXTAUTH_URL matches your actual URL (http://localhost:3000 for local development) 