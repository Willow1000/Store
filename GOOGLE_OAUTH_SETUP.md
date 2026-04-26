# Google OAuth Setup Guide

Your website now uses Supabase's built-in Google OAuth integration! Here's how to complete the setup:

## Steps to Enable Google OAuth on Supabase

### 1. **Go to Supabase Dashboard**
   - Visit [https://app.supabase.com](https://app.supabase.com)
   - Select your project (dormxdlqbstebbsumdjj)
   - Go to **Authentication** → **Providers**

### 2. **Configure Google Provider**
   - Click on **Google** provider
   - You should see two options:
     - **Redirect URL** (this is what you need to add to Google Cloud Console)
     - **API Keys** section (where you paste your Google credentials)

### 3. **Set Up Google OAuth in Google Cloud Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing one
   - Go to **Credentials**
   - Create **OAuth 2.0 Client ID** (Desktop/Web Application)
   - Add authorized redirect URIs:
     ```
     http://localhost:5173/auth/callback
     https://dormxdlqbstebbsumdjj.supabase.co/auth/v1/callback?provider=google
     https://YOUR_DOMAIN.com/auth/callback  (for production)
     ```

### 4. **Add Credentials to Supabase**
   - Copy your **Google Client ID** and **Client Secret** from Google Cloud Console
   - Paste them in the Supabase Google provider settings
   - Save

## How It Works

### Frontend Flow
1. User clicks "Continue with Google" button in AuthModal
2. `handleGoogleSignIn()` is called → redirects to Google login
3. User authenticates with Google
4. Google redirects to `/auth/callback`
5. Supabase handles the callback and creates/updates the user session
6. User is logged in and redirected to home page

### Key Files Modified
- **`client/src/components/AuthModal.tsx`** - Updated to use Supabase OAuth
- **`client/src/pages/AuthCallback.tsx`** - New page to handle OAuth callback
- **`client/src/_core/hooks/useAuth.ts`** - Updated to use Supabase Auth sessions
- **`client/src/lib/supabase.ts`** - Updated Supabase client config
- **`client/src/App.tsx`** - Added `/auth/callback` route
- **`.env.local`** - Added OAuth callback URL documentation

## Features Implemented

✅ Google OAuth Sign In  
✅ GitHub OAuth Sign In  
✅ Email/Password Sign Up  
✅ Email/Password Sign In  
✅ Automatic session management  
✅ OAuth callback handling  
✅ Loading states on buttons  
✅ Error handling with toasts  

## Testing Locally

1. Start your dev server: `pnpm dev`
2. Navigate to home page
3. Click "Continue with Google" button
4. You should be redirected to Google login
5. After authentication, you'll be redirected back to `/auth/callback`
6. You should be logged in and see your account info in the header

## Important Notes

- The callback URL **must match exactly** in both Google Cloud Console and Supabase
- For local development: use `http://localhost:5173/auth/callback`
- For production: update the callback URL in both Google Cloud Console and ensure it points to your domain
- Supabase will automatically create or update user records on successful authentication
- User email and profile information is automatically synced from Google

## Troubleshooting

### "Redirect URI mismatch" Error
- Check that the callback URL in Google Cloud Console exactly matches Supabase settings
- Remove trailing slashes if there are any
- Ensure protocol matches (http vs https)

### User not being created
- Check that Supabase Auth email verification is disabled (or user verified their email)
- Verify that the user table has proper RLS policies

### Session not persisting
- Check browser localStorage is enabled
- Verify no CSP headers are blocking sessionStorage
- Clear browser cache and try again

## Next Steps

1. ✅ Frontend: Google OAuth is now set up
2. ⏳ Backend: Create API routes to sync user data from Supabase Auth to your users table (if needed)
3. ⏳ Database: Set up RLS policies for user data protection
4. ⏳ Production: Update redirect URLs for your production domain
