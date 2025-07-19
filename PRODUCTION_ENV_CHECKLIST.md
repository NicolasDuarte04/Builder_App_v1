# Production Environment Checklist 🚀

## Required Environment Variables

### 1. **NextAuth Configuration**
```env
NEXTAUTH_URL=https://brikiapp.com
NEXTAUTH_SECRET=<your-secret-key>
```
⚠️ **Critical**: `NEXTAUTH_URL` must be set to your production URL for OAuth callbacks to work!

### 2. **Google OAuth**
```env
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
```

### 3. **Supabase Configuration**
```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```
⚠️ **Important**: The service role key is needed for server-side operations that bypass RLS

### 4. **OpenAI Configuration**
```env
OPENAI_API_KEY=<your-openai-key>
```

## Google Cloud Console Setup

### Authorized Redirect URIs
Add these URIs in your Google Cloud Console OAuth 2.0 settings:
- `https://brikiapp.com/api/auth/callback/google` (production)
- `http://localhost:3000/api/auth/callback/google` (development)
- `https://<your-vercel-preview-url>.vercel.app/api/auth/callback/google` (preview deployments)

## Supabase Configuration

### 1. **Database Tables**
Ensure these tables exist:
- `users` (not `auth.users` - custom table for NextAuth)
- `policy_uploads` with proper foreign key to `public.users(id)`

### 2. **RLS Policies**
For `policy_uploads` table:
```sql
-- Enable RLS
ALTER TABLE policy_uploads ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own records
CREATE POLICY "Users can insert their own policy uploads" ON policy_uploads
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Allow users to view their own records
CREATE POLICY "Users can view their own policy uploads" ON policy_uploads
FOR SELECT USING (auth.uid()::text = user_id);

-- Allow users to update their own records
CREATE POLICY "Users can update their own policy uploads" ON policy_uploads
FOR UPDATE USING (auth.uid()::text = user_id);
```

## Vercel Configuration

### Environment Variables
Add all the above environment variables in Vercel project settings.

### Function Timeout
The PDF analysis function requires extended timeout:
```json
{
  "functions": {
    "src/app/api/ai/analyze-policy/route.ts": {
      "maxDuration": 60
    }
  }
}
```

## Debugging Production Issues

### 1. **OAuth Not Working**
- Check browser console for errors
- Verify `NEXTAUTH_URL` is set correctly
- Check Google Cloud Console for correct redirect URIs
- Look at Vercel function logs for auth errors

### 2. **PDF Upload Failing**
- Check Vercel function logs for detailed error messages
- Verify all Supabase environment variables are set
- Check RLS policies in Supabase dashboard
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set for server operations

### 3. **Session Not Persisting**
- Verify `NEXTAUTH_SECRET` is the same across all deployments
- Check browser cookies for `next-auth.session-token`
- Ensure HTTPS is properly configured

## Testing Production

1. **Test OAuth Flow**
   - Sign out completely
   - Clear browser cookies
   - Try signing in with Google
   - Check if redirected to home page

2. **Test PDF Upload**
   - Sign in first
   - Upload a small PDF
   - Check Supabase dashboard for new record
   - Verify AI analysis completes

3. **Check Logs**
   - Vercel Functions logs
   - Browser console
   - Network tab for failed requests 