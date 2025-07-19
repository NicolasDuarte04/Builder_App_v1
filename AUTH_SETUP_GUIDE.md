# Authentication Setup Guide

## Overview
The login and register pages have been simplified with a clean, white background design and centered forms. The authentication system uses NextAuth.js with Supabase as the database.

## Current Issues & Solutions

### 1. Environment Variables
The authentication system requires the following environment variables to be set in your `.env.local` file:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. Database Setup
Run the following SQL in your Supabase dashboard to create the users table:

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### 3. Testing the Setup
Visit `http://localhost:3001/api/test-auth` to check if your environment is properly configured.

## Features Implemented

### Login Page (`/login`)
- Clean white background with centered form
- Email and password fields with validation
- Show/hide password toggle
- Remember me checkbox
- Forgot password link (placeholder)
- Google sign-in option
- Error handling with user-friendly messages
- Responsive design

### Register Page (`/register`)
- Clean white background with centered form
- Name, email, and password fields with validation
- Password minimum length requirement (8 characters)
- Terms and conditions checkbox (required)
- Google sign-up option
- Auto-login after successful registration
- Redirects to onboarding page

### API Endpoints
- `/api/auth/[...nextauth]` - NextAuth.js handler
- `/api/auth/register` - User registration endpoint
- `/api/test-auth` - Environment and database connection test

## Troubleshooting

1. **"Invalid email or password" error**
   - Ensure the users table exists in Supabase
   - Check that environment variables are set correctly
   - Verify the user exists in the database

2. **Registration fails**
   - Check Supabase connection
   - Ensure the users table has proper permissions
   - Check browser console for specific errors

3. **Google sign-in not working**
   - Set up Google OAuth credentials
   - Add correct redirect URLs in Google Console
   - Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

## Next Steps
1. Set up your Supabase project and get the required keys
2. Create a `.env.local` file with your environment variables
3. Run the SQL migration to create the users table
4. Test the authentication flow 