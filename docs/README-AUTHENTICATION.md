# Authentication System Guide

This document explains how user authentication works in the Marqness hobby tracking application.

## 🔐 Authentication Overview

The app now includes full user authentication, ensuring that each user can only see and manage their own time entries. This is implemented using Supabase Authentication with Row Level Security (RLS).

## 🏗️ Architecture

### Authentication Flow
1. **Unauthenticated Users** see a welcome screen with sign-in option
2. **Registration** creates a new user account with email confirmation
3. **Sign In** authenticates existing users
4. **Protected Routes** automatically redirect unauthenticated users
5. **User-Specific Data** ensures each user only sees their own time entries

### Database Security
- **Row Level Security (RLS)** is enabled on the `time_entries` table
- **Authentication Policies** automatically filter data by authenticated user
- **User Association** every time entry is linked to a specific user via `user_id`

## 🚀 Getting Started

### First Time Setup

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Visit http://localhost:5173** - you'll see the welcome screen

3. **Create an account:**
   - Click "Sign In / Create Account"
   - Toggle to "Create Account"
   - Enter email and password (minimum 6 characters)
   - Check your email for confirmation (for production)

4. **Start tracking time:**
   - Once signed in, you'll see the familiar timer interface
   - All time entries are automatically associated with your account

### User Experience

#### Sign Up Process
- **Email & Password** - Standard registration
- **Email Confirmation** - Required in production (skipped in development)
- **Automatic Sign In** - After successful registration
- **Validation** - Email format and password length requirements

#### Sign In Process
- **Persistent Sessions** - Stay logged in across browser sessions
- **Automatic Redirect** - Go straight to timer after sign in
- **Error Handling** - Clear feedback for invalid credentials

#### Authenticated Experience
- **Personal Dashboard** - Only your time entries
- **User Profile** - Email displayed in navigation
- **Easy Sign Out** - Single click logout
- **Secure Data** - No access to other users' data

## 🛠️ Technical Implementation

### Authentication Context
```typescript
// Available throughout the app
const { user, session, loading, signUp, signIn, signOut } = useAuth();
```

### Protected Components
- **AuthGuard** - Wraps the entire app, redirects unauthenticated users
- **User-Specific Queries** - All database calls include user filtering
- **Automatic User Association** - New entries automatically linked to current user

### Database Schema
```sql
-- User association
ALTER TABLE time_entries ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Row Level Security policies
CREATE POLICY "Users can view own time entries" ON time_entries
    FOR SELECT USING (auth.uid() = user_id);
```

### API Integration
- **Automatic User Context** - Service layer automatically includes current user
- **Error Handling** - Clear authentication error messages
- **Session Management** - Handles token refresh automatically

## 🔧 Configuration

### Environment Variables
```bash
# .env file
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Supabase Settings
- **Email Confirmation** - Disabled for development, enabled for production
- **Password Requirements** - Minimum 6 characters
- **Session Duration** - 1 hour by default

## 📋 User Management

### For Developers

**Creating Test Users:**
```bash
# Use the sign-up form in the app
# Or via Supabase Studio at http://localhost:54323
```

**Viewing User Data:**
```bash
# Access Supabase Studio
open http://localhost:54323

# Navigate to Authentication > Users
# View user accounts and sessions
```

**Database Queries:**
```sql
-- View all users
SELECT * FROM auth.users;

-- View time entries for specific user
SELECT * FROM time_entries WHERE user_id = 'user_id_here';
```

### For Users

**Account Management:**
- **Change Password** - Via Supabase (future enhancement)
- **Update Email** - Via Supabase (future enhancement)
- **Delete Account** - Contact admin (future enhancement)

**Data Privacy:**
- Your time entries are completely private
- No other users can access your data
- Data is automatically filtered by your user ID

## 🔍 Testing Authentication

### Manual Testing Flow

1. **Test Unauthenticated Access:**
   - Visit app without signing in
   - Confirm you see welcome screen
   - Verify no timer/dashboard access

2. **Test Registration:**
   - Create new account with valid email
   - Check password validation
   - Confirm successful account creation

3. **Test Sign In:**
   - Sign in with valid credentials
   - Test invalid credentials error handling
   - Verify redirect to timer after sign in

4. **Test Protected Features:**
   - Create time entries
   - View dashboard
   - Confirm data persistence across sessions

5. **Test Sign Out:**
   - Sign out and verify redirect
   - Confirm session is cleared
   - Test that direct URLs redirect to welcome

### Common Issues

**"User must be authenticated" Errors:**
- Check if session is properly loaded
- Verify AuthProvider wraps the app
- Confirm environment variables are set

**RLS Policy Errors:**
- Verify user_id is included in database operations
- Check that policies are properly applied
- Ensure migrations ran successfully

**Email Confirmation Issues:**
- In development, check Inbucket at http://localhost:54324
- In production, check spam/junk folders
- Verify email settings in Supabase

## 🚀 Future Enhancements

### Planned Features
- [ ] **Password Reset** - Email-based password recovery
- [ ] **Email Change** - Update email with confirmation
- [ ] **Profile Management** - User settings and preferences
- [ ] **Social Login** - Google, GitHub OAuth options
- [ ] **Multi-Factor Auth** - TOTP/SMS 2FA support

### Security Improvements
- [ ] **Rate Limiting** - Prevent brute force attacks
- [ ] **Session Management** - Advanced session controls
- [ ] **Audit Logging** - Track authentication events
- [ ] **Device Management** - View/revoke active sessions

---

**Last Updated:** January 2024  
**Authentication Version:** v1.0.0 with Supabase Auth + RLS 