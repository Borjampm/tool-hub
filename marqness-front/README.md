# Marqness Frontend

A modern React application built with **Vite**, **TypeScript**, and **TailwindCSS v4**.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (version 18+ recommended)
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd marqness-server/marqness-front

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173/`

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |
| `npm run lint:fix` | Run ESLint and auto-fix issues |

## 🛠 Tech Stack

- **⚡ Vite** - Fast build tool and dev server
- **⚛️ React 19** - UI framework with latest features
- **📘 TypeScript** - Type-safe JavaScript
- **🎨 TailwindCSS v4** - Utility-first CSS framework (latest version)
- **🔍 ESLint** - Code linting and formatting

## 🎨 TailwindCSS v4 Setup

This project uses **TailwindCSS v4**, which has a completely different architecture from v3:

### Key Differences from v3:

| Feature | TailwindCSS v3 | TailwindCSS v4 |
|---------|----------------|----------------|
| **Configuration** | `tailwind.config.js` | CSS-first with `@theme` directive |
| **CLI Package** | `tailwindcss` | `@tailwindcss/cli` |
| **Import** | `@tailwind base;`<br/>`@tailwind components;`<br/>`@tailwind utilities;` | `@import "tailwindcss";` |
| **Setup** | PostCSS plugin | Vite plugin (faster) |

### Configuration

- **Main CSS file**: `src/index.css`
- **Vite plugin**: Configured in `vite.config.ts`
- **No config files needed** - TailwindCSS v4 uses CSS-based configuration

### Custom Theme (Optional)

Add custom theme variables in `src/index.css`:

```css
@import "tailwindcss";

@theme {
  --font-display: "Inter", sans-serif;
  --color-primary: #3b82f6;
  --color-secondary: #10b981;
  --breakpoint-3xl: 1920px;
}
```

### Using TailwindCSS Classes

```jsx
// Example usage
<h1 className="text-4xl font-bold text-blue-600">
  Hello TailwindCSS v4!
</h1>

<div className="bg-primary p-8 rounded-lg shadow-lg">
  <p className="text-white">Custom themed component</p>
</div>
```

## 🔧 Development Setup

### ESLint Configuration

The project uses modern ESLint configuration with:
- React-specific rules
- TypeScript support
- Security recommendations

**Important ESLint Rules:**
- Add `rel="noreferrer"` to external links with `target="_blank"`
- React 19 doesn't require `import React` in every file

### File Structure

```
marqness-front/
├── src/
│   ├── components/          # Reusable components
│   ├── assets/             # Static assets
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # App entry point
│   ├── index.css           # Global styles + TailwindCSS
│   └── App.css             # Component-specific styles
├── public/                 # Public assets
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── eslint.config.js        # ESLint configuration
└── package.json            # Dependencies and scripts
```

## 🚨 Common Issues & Solutions

### ESLint Errors

**Issue**: `'React' must be in scope when using JSX`
```bash
# This is expected in React 19 - you don't need to import React
# The error will be resolved by updating ESLint config
```

**Issue**: External links security warning
```jsx
// ❌ Incorrect
<a href="https://example.com" target="_blank">Link</a>

// ✅ Correct
<a href="https://example.com" target="_blank" rel="noreferrer">Link</a>
```

### TailwindCSS Not Working

1. **Check import**: Ensure `@import "tailwindcss";` is in `src/index.css`
2. **Check Vite config**: Verify `tailwindcss()` plugin is in `vite.config.ts`
3. **Restart dev server**: `npm run dev`

### Build Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 📦 Dependencies

### Core Dependencies
- `react`: ^19.1.0
- `react-dom`: ^19.1.0

### Build Tools
- `vite`: ^7.0.4
- `@vitejs/plugin-react`: ^4.6.0
- `typescript`: ~5.8.3

### Styling
- `tailwindcss`: ^4.1.11
- `@tailwindcss/vite`: Latest
- `@tailwindcss/cli`: Latest
- `autoprefixer`: ^10.4.21
- `postcss`: ^8.5.6

### Linting
- `eslint`: ^9.30.1
- `eslint-plugin-react`: Latest
- `typescript-eslint`: ^8.35.1

## 🔄 Migration Notes

### From TailwindCSS v3 to v4

If migrating from v3, key changes:
1. **Remove** `tailwind.config.js`
2. **Replace** `@tailwind` directives with `@import "tailwindcss"`
3. **Update** Vite config to use `@tailwindcss/vite`
4. **No PostCSS config** needed (handled by Vite plugin)

### Auto Migration Tool

TailwindCSS provides an upgrade tool:
```bash
npx @tailwindcss/upgrade@next
```

## 📚 Resources

- [TailwindCSS v4 Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

## 🤝 Development Workflow

1. **Start development**: `npm run dev`
2. **Make changes**: Edit files in `src/`
3. **Check linting**: `npm run lint`
4. **Build for production**: `npm run build`
5. **Preview build**: `npm run preview`

## 📄 License

[Add your license here]

---

**Happy coding! 🚀**
