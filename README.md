# Tool Hub — Everyday Tools and Experiments

Tool Hub is a personal hub to interact with the tools I use every day, while also serving as a sandbox to build, try, and easily deploy new experimental features. Each tool is an app that can evolve independently, yet share common building blocks like authentication, UI components, and data services.

## 🎯 What’s inside

### 🎨 Hobby Tracker
Track creative pursuits and personal activities.
- **⏱️ Timers**: Start/stop/resume activity sessions
- **📝 Context**: Name, describe, and categorize sessions
- **📊 Insights**: Dashboard with trends and activity breakdowns
- **📜 History**: Activity log with filtering and CSV export
- **⚙️ Settings**: Manage personal hobby categories

### 💰 Expense Tracker (active development)
Manage personal expenses and categories.
- **➕ Add Transactions**: Amount, description, date, account, and category
- **🗂 Categories**: Personal expense categories with colors
- **🏦 Accounts**: Default personal accounts
- **📃 Transactions List**: Browse and filter transaction history
- **📈 Dashboard**: Early overview of spending (iterating)

### 🎵 Music Tools (foundations in progress)
Explore and prototype music-focused utilities.
- **🎚️ Metronome**: Dial tempo, pick subdivisions, and rehearse with sample-accurate audio clicks
- **📖 Reading Practice**: Build sight-reading skills

> The hub is designed to grow. New apps can be added quickly and shipped independently without breaking existing ones.

## 🧩 Architecture at a glance

Apps are independent, but share common elements:
- **Independent apps**: Each app lives in its own folder under `src/components/` and ships its own UI and flows
- **Shared UI**: Common components under `src/components/shared/` (landing page, auth, guards, verification, etc.)
- **Contexts**: Cross-app providers under `src/contexts/` (authentication, timers)
- **Services**: App-agnostic data/services under `src/services/` (time entries, categories, transactions, CSV export, settings)
- **Lib**: Integration and utilities under `src/lib/` (Supabase client, date/time helpers)
- **Database**: Supabase config and SQL migrations under `supabase/`

This modular approach lets you build and deploy new tools without coupling them to existing apps.

## 🚀 Getting started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd tool-hub

# Install dependencies
npm install

# Environment variables
cp .env.example .env

# (Optional) Start local Supabase for development
npx supabase start

# Run the app
npm run dev
```

The app will be available at `http://localhost:5173/`.

## 🧭 Using the hub
1. **Sign in** using the built-in auth flow
2. **Pick an app** on the landing page (Hobby Tracker, Expense Tracker, Music Tools)
3. **Use the tool**:
   - Hobby Tracker: start a timer, add context, review history, export CSV, manage categories
   - Expense Tracker: add transactions, manage categories and accounts, review lists (early)
4. **Switch apps** anytime from the hub navigation

## 🗂 Project structure

```
src/
├── components/
│   ├── shared/                    # Shared UI (landing, auth, guards, verification)
│   ├── hobby-tracker/             # Hobby Tracker app (views, modals, timer components)
│   ├── expense-tracker/           # Expense Tracker app (pages, forms, lists)
│   └── music-tools/               # Music Tools app (experiments and utilities)
├── contexts/                      # Cross-app React contexts (auth, timer)
├── services/                      # App-agnostic services (CRUD, CSV, categories, transactions)
├── lib/                           # Supabase client, date/time utilities
└── supabase/                      # Supabase config and SQL migrations
```

## 🔐 Auth, data, and standards
- **Authentication**: Supabase Auth with guards and modals in `src/components/shared/`
- **Row Level Security**: Users can only access their own data
- **Date & time display**: Uses shared utilities for dd/mm/yyyy and 24-hour formats

## 📦 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |
| `npm run lint:fix` | Run ESLint and auto-fix issues |

## 🛠 Tech stack
- **Vite**, **React 19**, **TypeScript**, **TailwindCSS v4**
- **Supabase** (PostgreSQL, Auth, RLS)
- **ESLint**, **React Context**, **React Hook Form**

## 🧪 Add a new experimental app
1. Create a folder under `src/components/<your-app>/`
2. Build your UI and logic (optionally create services under `src/services/`)
3. Add navigation to the app from `src/components/shared/LandingPage.tsx`
4. Reuse shared auth, contexts, and styles where helpful
5. Deploy — existing apps remain unaffected

## ☁️ Deployment
- Host the frontend on your platform of choice (e.g., Vercel/Netlify). Build with `npm run build`.
- Provision Supabase and set the environment variables from your project into `.env`.
- Database migrations live in `supabase/migrations/` — review SQL before applying.

> Safety note: Do not run database push commands blindly. Review migration content and apply changes intentionally.

## 📚 Additional docs
- `docs/troubleshooting.md`: Common issues and fixes
- `docs/README-AUTHENTICATION.md`: Auth setup and flows
- `docs/README-SUPABASE.md`: Supabase configuration and local dev

---

This hub helps me run daily tools and ship experiments fast, without entangling apps. Build something new, plug it in, and deploy.
