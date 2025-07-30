# Marqness - Personal Productivity & Tracking Hub

**Marqness** is a comprehensive personal productivity platform designed to help you track, monitor, and analyze various aspects of your life. Built with modern web technologies, it provides a seamless experience across multiple specialized applications, all unified under one elegant interface.

## 🎯 What is Marqness?

Marqness is a personal productivity hub that brings together multiple tracking applications:

### 🎨 Hobby Tracker
Your dedicated space for tracking creative pursuits and personal interests:
- **⏱️ Track Time**: Start and stop timers for any hobby activity with a simple click
- **📝 Add Context**: Describe your hobby sessions with names, descriptions, and custom categories  
- **📊 Analyze Patterns**: View detailed analytics and insights about your hobby engagement
- **🏷️ Custom Categories**: Organize your activities with personalized categories

### 💰 Expense Tracker *(Coming Soon)*
Smart financial management for your personal expenses:
- **💳 Track Spending**: Monitor your daily expenses and financial habits
- **📈 Budget Analysis**: Understand your spending patterns and optimize your budget
- **🏷️ Category Management**: Organize expenses by custom categories
- **📊 Financial Insights**: Visual analytics for better financial decision-making

### 🚀 More Apps Coming Soon
The platform is designed to grow with additional productivity applications:
- **📚 Data Explorer** *(Planned)*
- **🏃 AI Chat** *(Planned)*
- **🎯 Telegram Bot** *(Planned)*

## 🌟 Platform Features

### Unified Experience
- **🏠 App Hub**: Seamless navigation between different tracking applications
- **🔒 Single Sign-On**: One account access to all your tracking apps
- **📱 Responsive Design**: Consistent experience across desktop, tablet, and mobile
- **🎨 Cohesive Design**: Unified design language across all applications

### Privacy & Security
- **🔒 Data Privacy**: Your tracking data is completely private and secure
- **👤 Personal Data**: Each user's data is isolated and protected
- **🔐 Secure Authentication**: Industry-standard authentication system
- **📱 Cross-Device Sync**: Access your data from any device

## ✨ Current Applications

### Hobby Tracker - Feature Complete ✅

**Simple Tracking Workflow:**
1. **🚀 Start**: Click "Start" to begin timing any hobby activity
2. **⏹️ Stop**: Click "Stop" when you're done 
3. **📋 Describe**: Add a name, description, and category for your session
4. **💾 Save**: Your entry is automatically saved to your personal database

**Analytics & Insights:**
- **📈 Summary Statistics**: Total entries, total time tracked, and average session length
- **📊 Category Breakdown**: Visual breakdown of time spent across different hobby categories
- **📋 Activity History**: Complete list of all your hobby entries with details
- **⏰ Recent Activity**: Quick view of your most recent sessions
- **📊 Export Options**: Export your data for external analysis (CSV format)

### Expense Tracker - Under Development 🚧

The expense tracking application is currently in development and will provide comprehensive financial tracking capabilities with the same level of polish and attention to detail as the hobby tracker.

## 🚀 Quick Start

### For Users

1. **Visit the Application**: Navigate to your Marqness instance
2. **Create Account**: Sign up with your email and password  
3. **Choose Your App**: Select from available tracking applications
4. **Start Tracking**: Begin using your chosen application immediately
5. **Switch Apps**: Easily navigate between different tracking tools as needed

### For Developers

#### Prerequisites
- **Node.js** (version 18+ recommended)
- **npm** or **yarn**

#### Installation

```bash
# Clone the repository
git clone <repository-url>
cd marqness-server/marqness-front

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Start local Supabase (for development)
npx supabase start

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173/`

## 🛠 Tech Stack

Marqness is built with modern, reliable technologies:

### Frontend
- **⚡ Vite** - Fast build tool and dev server for optimal development experience
- **⚛️ React 19** - Latest React with improved performance and developer experience
- **📘 TypeScript** - Type-safe JavaScript for better code quality and developer productivity
- **🎨 TailwindCSS v4** - Latest utility-first CSS framework for rapid UI development
- **🔍 ESLint** - Code linting and formatting for consistent code quality

### Backend & Database
- **🗄️ Supabase** - Backend-as-a-Service with PostgreSQL database
- **🔒 Row Level Security** - Database-level security ensuring user data isolation
- **🔐 Supabase Auth** - Secure user authentication and session management
- **📊 Real-time Features** - Live updates and synchronization across devices

### Development Tools
- **📦 NPM** - Package management
- **🔧 React Context** - State management for applications and authentication
- **📋 React Hook Form** - Form handling and validation
- **🎯 TypeScript Strict Mode** - Enhanced type safety with verbatimModuleSyntax

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |
| `npm run lint:fix` | Run ESLint and auto-fix issues |

## 🏗 Project Structure

```
marqness-front/
├── src/
│   ├── components/              # React components
│   │   ├── shared/             # Shared components across apps
│   │   │   ├── LandingPage.tsx # App hub and navigation
│   │   │   ├── AuthGuard.tsx   # Authentication protection
│   │   │   └── AuthModal.tsx   # User authentication
│   │   ├── hobby-tracker/      # Hobby tracking application
│   │   │   ├── HobbyTrackerApp.tsx # Main hobby tracker
│   │   │   ├── TimerView.tsx   # Timer interface
│   │   │   ├── Dashboard.tsx   # Analytics and insights
│   │   │   ├── Activities.tsx  # Activity management
│   │   │   └── Settings.tsx    # Categories and settings
│   │   └── expense-tracker/    # Expense tracking application
│   │       └── ExpenseTracker.tsx # Under development
│   ├── contexts/               # React Context providers
│   │   ├── AuthContext.tsx     # User authentication state
│   │   └── TimerContext.tsx    # Timer state management
│   ├── services/               # API and business logic
│   │   ├── timeEntryService.ts # Hobby entry CRUD operations
│   │   ├── categoryService.ts  # Category management
│   │   └── csvExportService.ts # Data export functionality
│   └── lib/
│       └── supabase.ts         # Database configuration
├── docs/                       # Documentation
│   └── troubleshooting.md      # Technical troubleshooting guide
└── supabase/                  # Database migrations and config
    └── migrations/            # SQL migration files
```

## 🔒 Security & Privacy

- **🛡️ Row Level Security**: Database policies ensure users can only access their own data
- **🔐 Secure Authentication**: Industry-standard authentication with Supabase Auth
- **📊 Data Isolation**: Complete separation of user data at the database level
- **🔒 Session Management**: Secure session handling with automatic token refresh
- **🏠 Unified Security**: Consistent security model across all applications

## 📚 Additional Documentation

- **[Troubleshooting Guide](docs/troubleshooting.md)** - Solutions for common development issues
- **[Authentication Setup](README-AUTHENTICATION.md)** - Detailed authentication system guide
- **[Supabase Integration](README-SUPABASE.md)** - Backend setup and configuration

## 🤝 Development Workflow

1. **Start Development**: `npm run dev`
2. **Make Changes**: Edit files in `src/` directory
3. **Check Code Quality**: `npm run lint`
4. **Build for Production**: `npm run build`
5. **Preview Build**: `npm run preview`

## 🎨 UI/UX Design Principles

- **🎯 Simplicity**: Clean, intuitive interface focused on core workflows
- **📱 Responsive**: Works seamlessly across all device sizes
- **⚡ Performance**: Fast loading times and smooth interactions
- **♿ Accessibility**: Designed with accessibility best practices
- **🌙 Modern Design**: Contemporary UI with thoughtful use of color and spacing
- **🔄 Consistency**: Unified design language across all applications

## 📈 Use Cases

**Perfect for:**
- **Personal Productivity Enthusiasts**: People who want to track multiple aspects of their life
- **Hobbyists & Creatives**: Tracking time spent on personal interests and creative projects
- **Budget-Conscious Individuals**: Managing personal finances and understanding spending habits
- **Data-Driven Decision Makers**: People who use analytics to optimize their lifestyle
- **Privacy-Focused Users**: Individuals who want full control over their personal data

**Key Benefits:**
- **All-in-One Platform**: Multiple tracking applications in one unified interface
- **Simple, Distraction-Free**: Clean interface focused on essential functionality
- **Automatic Sync**: Data backup and synchronization across devices
- **Detailed Analytics**: Comprehensive insights across all your tracking data
- **Complete Privacy**: Full data ownership and privacy protection
- **Cross-Platform**: Works consistently across all devices and browsers

## 🔮 Roadmap

### Near Term
- **💰 Expense Tracker**: Complete development of financial tracking features
- **📊 Cross-App Analytics**: Unified insights across all applications
- **🔄 Data Import/Export**: Enhanced data portability features

### Future Applications
- **📚 Reading Tracker**: Track books, articles, and reading progress
- **🏃 Fitness Logger**: Exercise and wellness tracking
- **🎯 Goal Tracker**: Personal goal setting and achievement monitoring
- **🌱 Habit Tracker**: Daily habit formation and tracking

---

**Ready to take control of your personal productivity?** 🚀

*Marqness brings together all your tracking needs in one place, helping you understand your patterns and make better decisions about how you spend your time and resources.*
