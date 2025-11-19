# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tool Hub is a personal multi-app platform for everyday tools and experimental features. Built with React 19, TypeScript, Vite, TailwindCSS v4, and Supabase (PostgreSQL + Auth). Each app is independent but shares common authentication, UI components, and data services.

**Current Apps:**
- **Hobby Tracker**: Timer-based activity tracking with categories, history, and CSV export
- **Expense Tracker**: Transaction management with categories, accounts, and recurring transactions
- **Music Tools**: Metronome and reading practice utilities

## Development Commands

```bash
# Development
npm run dev              # Start dev server at localhost:5173

# Building and Linting
npm run build            # TypeScript check + production build
npm run preview          # Preview production build locally
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues

# Supabase (Local Development)
npx supabase start       # Start local Supabase instance
npx supabase migration list  # View migration status
npx supabase db diff     # See database differences
```

## Git Workflow

### CRITICAL: Starting Work on This Project

**ALWAYS follow this workflow when beginning any task:**

1. Switch to main branch: `git checkout main`
2. Pull latest changes: `git pull origin main`
3. Create a new feature branch with a descriptive name

```bash
# Standard workflow at start of every session
git checkout main
git pull origin main
git checkout -b <descriptive-branch-name>
```

**Branch naming conventions:**
- Feature: `feature/<short-description>` or `<date>-<description>`
- Fix: `fix/<issue-description>`
- Docs: `docs/<what-changed>`

Examples:
- `feature/add-pomodoro-timer`
- `fix/metronome-tempo-bug`
- `2025-11-19-expense-filters`

**Why this matters:**
- Ensures you're working with the latest code
- Prevents merge conflicts
- Keeps main branch clean and deployable
- Makes it easier to review and track changes

## Architecture

### Modular Multi-App Structure

Apps are independent but share foundational infrastructure:

```
src/
├── components/
│   ├── shared/              # Cross-app UI (landing, auth, guards, verification)
│   ├── hobby-tracker/       # Hobby Tracker app components
│   ├── expense-tracker/     # Expense Tracker app components
│   └── music-tools/         # Music Tools app components
├── contexts/                # React contexts (AuthContext, TimerContext)
├── services/                # App-agnostic data services (CRUD operations)
├── lib/                     # Supabase client, utilities (dateUtils, etc.)
└── supabase/                # Database config and SQL migrations
```

**Key Architecture Principles:**
- Each app folder (`hobby-tracker/`, `expense-tracker/`, etc.) contains all app-specific components
- Shared components in `shared/` are used across multiple apps (auth, landing page)
- Services layer (`services/`) handles all database operations and business logic
- All data access goes through Supabase with Row Level Security (RLS) policies

### Import Path Conventions

From app component folders (e.g., `src/components/hobby-tracker/`):
```typescript
// Services and contexts (up two levels)
import { TimeEntryService } from '../../services/timeEntryService';
import { useAuth } from '../../contexts/AuthContext';

// Shared components (up one, then to shared)
import { AuthGuard } from '../shared/AuthGuard';

// Same folder (relative)
import { TimerDisplay } from './TimerDisplay';

// Types from lib
import type { TimeEntry } from '../../lib/supabase';
```

From shared components (`src/components/shared/`):
```typescript
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
```

**Never import components from other app folders directly** (e.g., don't import hobby-tracker components into expense-tracker).

## Authentication & Security

### Critical Authentication Rules

**ALWAYS verify user authentication in service methods:**
```typescript
// ✅ CORRECT - Every service method must check auth
static async createEntry(data: CreateTimeEntryData): Promise<TimeEntry> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User must be authenticated to create time entries');
  }

  // Include user.id in database operations
  const { data, error } = await supabase
    .from('time_entries')
    .insert({ ...data, user_id: user.id });
}
```

**Database Query Pattern:**
- All queries MUST filter by `user_id`
- ALWAYS include `user_id` in inserts/updates
- Row Level Security (RLS) enforces user data isolation

**Component Protection:**
```typescript
// Wrap protected routes with AuthGuard
<AuthProvider>
  <AuthGuard>
    <ProtectedComponent />
  </AuthGuard>
</AuthProvider>
```

### Supabase Integration
- Single Supabase client instance in `src/lib/supabase.ts`
- NEVER create multiple client instances
- Use `useAuth()` hook for authentication state in components
- Centralized database types in `src/lib/supabase.ts`

## TypeScript & Import Rules

### Type-Only Imports (CRITICAL)

This project uses `verbatimModuleSyntax` in TypeScript config, which **requires** type-only imports:

```typescript
// ✅ CORRECT - Type-only imports for types/interfaces
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { TimeEntry } from '../../lib/supabase';

// ✅ CORRECT - Regular imports for runtime values
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// ❌ WRONG - Will cause compilation errors
import { User, Session } from '@supabase/supabase-js';
```

**Rule:** If it's used in type annotations, use `import type`. If it's used at runtime, use regular `import`.

## Date & Time Formatting

### Global Standard: dd/mm/yyyy Format

**ALWAYS use day/month/year format** for all date displays:

```typescript
// Use dateUtils helpers
import { formatDate, formatDateTime } from '../../lib/dateUtils';

// Examples:
formatDate(dateString);        // "20/01/2025"
formatDateTime(dateString);    // "20/01/2025, 15:30"
```

**Manual formatting (if needed):**
```typescript
new Date(dateString).toLocaleDateString('en-GB', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
// Output: "20/01/2025"
```

**Database vs Display:**
- Database: ISO format (YYYY-MM-DD)
- User Display: dd/mm/yyyy format
- Use 24-hour time format (15:30, not 3:30 PM)

## Database Migrations

### CRITICAL: Migration Safety Rules

**NEVER run `npx supabase db push` without explicit user confirmation.**

Migration workflow:
1. Create migration file in `supabase/migrations/`
2. Show user the migration SQL content
3. Explain what changes will occur
4. **Ask for explicit permission** before pushing
5. Let user run the command themselves if they prefer

Safe commands:
- ✅ `npx supabase migration list` - Check status
- ✅ `npx supabase db diff` - View differences
- ❌ `npx supabase db push` - REQUIRES user confirmation
- ❌ `npx supabase db reset` - REQUIRES user confirmation

Migrations are irreversible. Always review SQL before applying.

## Code Quality & Pre-Commit Checks

### CRITICAL: Always Check for Errors Before Committing

**ALWAYS run lint and type checks before creating commits or push requests:**

```bash
# Run both checks before committing
npm run build    # TypeScript type checking + build
npm run lint     # ESLint checks
```

**Pre-commit workflow:**
1. Make your code changes
2. Run `npm run build` to verify TypeScript compilation succeeds
3. Run `npm run lint` to check for linting issues (use `npm run lint:fix` for auto-fixes)
4. Only commit if both commands pass without errors
5. Create commit with descriptive message
6. Push to remote

**Why this matters:**
- TypeScript errors will break the build in production
- Linting errors indicate code quality issues or potential bugs
- Catching errors locally is faster than waiting for CI/CD failures
- Maintains consistent code quality across the project

**NEVER:**
- Commit code with TypeScript compilation errors
- Push code without running build checks first
- Ignore linting errors (fix them or use `npm run lint:fix`)

## Service Layer Pattern

All database operations go through service classes in `src/services/`:
- `timeEntryService.ts` - Hobby tracker time entries
- `categoryService.ts` - Hobby categories
- `transactionService.ts` - Expense transactions
- `recurringTransactionService.ts` - Recurring transactions
- `expenseCategoryService.ts` - Expense categories
- `userAccountService.ts` - User accounts
- `csvExportService.ts` - CSV export functionality
- `userSettingsService.ts` - User preferences

Services handle:
- Authentication checks
- Database queries with user filtering
- Error handling
- Business logic

## Database Schema Overview

**Hobby Tracker Tables:**
- `time_entries` - Activity sessions with start/end times
- `hobby_categories` - User-defined hobby categories

**Expense Tracker Tables:**
- `transactions` - Income/expense transactions
- `recurring_transactions` - Scheduled recurring transactions
- `user_expense_categories` - User-defined expense categories
- `user_accounts` - Bank accounts, cash, credit cards, etc.

**Shared Tables:**
- `user_settings` - User preferences (e.g., weekly hobby goals)

**Key Pattern:** All tables include `user_id` with RLS policies enforcing data isolation.

## Key Database Features

- **Foreign Key Migrations**: Legacy text fields (`category`, `account`) migrated to FK relationships (`category_id`, `account_id`)
- **Recurring Transactions**: Support for scheduled transactions with skip functionality
- **Default Categories & Accounts**: Auto-created for new users via triggers
- **Single In-Progress Timer**: Enforced at database level for hobby tracker

## Adding a New App

1. Create folder under `src/components/<app-name>/`
2. Build UI and logic (create services in `src/services/` if needed)
3. Add navigation link in `src/components/shared/LandingPage.tsx`
4. Add route in `src/App.tsx`
5. Reuse shared auth, contexts, and components
6. Deploy - existing apps remain unaffected

## Deployment

- Frontend: Build with `npm run build`, deploy to Vercel/Netlify/Cloudflare
- Backend: Supabase project with environment variables in `.env`
- Migrations: Located in `supabase/migrations/` - review before applying

## Tech Stack Summary

- **Frontend**: Vite, React 19, TypeScript, TailwindCSS v4
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Forms**: React Hook Form
- **Routing**: React Router DOM v7
- **Deployment**: Cloudflare Pages (via @cloudflare/vite-plugin)
