# Supabase Integration Setup

This guide explains how to set up and run the time tracking app with Supabase.

## Prerequisites

- Node.js and npm installed
- Supabase CLI installed (`npm install -g supabase`)

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the environment template:

```bash
cp .env.example .env
```

The default configuration uses local Supabase URLs, which will work with the local development setup.

### 3. Start Supabase

Start the local Supabase instance:

```bash
npx supabase start
```

This will:
- Start PostgreSQL database
- Run the migration to create the `time_entries` table
- Load sample data from `seed.sql`
- Start the Supabase Studio on http://localhost:54323

### 4. Start the Frontend

```bash
npm run dev
```

The app will be available at http://localhost:5173

## Database Schema

The app uses a single `time_entries` table with the following structure:

```sql
CREATE TABLE time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    elapsed_time INTEGER, -- in seconds
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Usage

### Authentication Required
The app now requires user authentication. When you first visit:

1. **Sign Up**: Create a new account with email and password
2. **Sign In**: Use existing credentials to access your data
3. **Protected Data**: Each user can only see their own time entries

### Time Tracking Flow
1. **Start Timer**: Click "Start" to begin tracking time (creates entry in database)
2. **Stop Timer**: Click "Stop" to pause and open the metadata form
3. **Save Entry**: Fill in the activity details and save to your account
4. **View Dashboard**: Check your personal time tracking history and statistics
5. **Sign Out**: Use the sign out button when done

## Supabase Studio

You can view and manage your data using Supabase Studio at http://localhost:54323 when the local instance is running.

## Production Deployment

For production:

1. Create a Supabase project at https://supabase.com
2. Update the `.env` file with your production URLs and keys
3. Run the migration in your production database:
   ```bash
   npx supabase db push
   ```

## Troubleshooting

- If you get connection errors, make sure Supabase is running: `npx supabase status`
- Check the browser console for any API errors
- Verify environment variables are set correctly 