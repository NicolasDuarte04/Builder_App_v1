# Google OAuth Session Persistence Fix 🔐

## Problem
After successfully authenticating with Google, the session was not being persisted, causing users to appear as not logged in.

## Root Cause
The NextAuth configuration had conflicts between:
1. Using a Supabase adapter (designed for `auth.users` table)
2. JWT session strategy
3. Custom `public.users` table

## Solution Implemented

### 1. Removed Supabase Adapter
Since we're using a custom `users` table (not Supabase Auth), we removed the adapter and rely on JWT sessions:

```typescript
// Before: Had adapter conflict
adapter: SupabaseAdapter({...})

// After: Pure JWT strategy
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 days
}
```

### 2. Added SignIn Callback
Created users in our custom table during Google sign-in:

```typescript
async signIn({ user, account, profile }) {
  if (account?.provider === "google") {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email!)
      .single();

    if (!existingUser) {
      // Create new user for Google sign-in
      await supabase.from('users').insert({
        email: user.email!,
        name: user.name || 'Google User',
      });
    }
    return true;
  }
  return true;
}
```

### 3. Enhanced JWT & Session Callbacks
Properly map database user IDs to sessions:

```typescript
async jwt({ token, user, account }) {
  if (account && user) {
    // For Google sign-ins, get user ID from database
    if (account.provider === "google") {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email!)
        .single();

      if (dbUser) {
        token.id = dbUser.id;
      }
    }
  }
  return token;
}

async session({ session, token }) {
  // Ensure session has correct user ID from database
  const { data: dbUser } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('email', session.user.email!)
    .single();

  if (dbUser) {
    (session.user as any).id = dbUser.id;
  }
  return session;
}
```

## Testing

### Test Page Created
Visit http://localhost:3000/test-auth to:
- Test Google sign-in
- View session details
- Check debug information
- Verify user ID is set correctly

### Expected Flow
1. Click "Sign in with Google"
2. Select Google account
3. Redirect back to app
4. Session status shows "authenticated"
5. User ID is properly set from database

## Key Changes Summary

1. ✅ Removed conflicting Supabase adapter
2. ✅ Added user creation on first Google sign-in
3. ✅ Properly map database IDs to JWT tokens
4. ✅ Enhanced session callbacks for ID persistence
5. ✅ Created test page for debugging

## Environment Requirements

Ensure these are set in `.env.local`:
- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET` (any random string)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` (for user creation)

## Next Steps

1. Test the authentication flow at http://localhost:3000/test-auth
2. Verify user creation in Supabase `users` table
3. Confirm session persistence across page refreshes
4. Check that PDF upload works with authenticated users 