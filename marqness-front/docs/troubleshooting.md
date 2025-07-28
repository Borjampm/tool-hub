# Troubleshooting Guide

This guide covers common issues and solutions when developing with Marqness.

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

### Authentication Issues

**Issue**: "User must be authenticated" errors
1. **Check authentication**: Ensure user is signed in
2. **Check environment**: Verify `.env` file has correct Supabase URLs
3. **Check database**: Ensure RLS policies are enabled

**Issue**: Data not loading or showing other users' data
1. **Check user context**: Verify `useAuth()` hook is properly implemented
2. **Check service methods**: Ensure all database queries include user filtering
3. **Check RLS policies**: Database should automatically filter by user_id

### Database Connection Issues

**Issue**: Cannot connect to Supabase
```bash
# Check if Supabase is running (local development)
npx supabase status

# If not running, start it
npx supabase start
```

**Issue**: Missing environment variables
```bash
# Copy the example file
cp .env.example .env

# Check that all required variables are set
cat .env
```

### Timer Issues

**Issue**: Timer not starting or stopping
1. **Check console**: Look for JavaScript errors in browser console
2. **Check network**: Verify API calls are succeeding in Network tab
3. **Check state**: Use React DevTools to inspect timer context state

**Issue**: Time entries not saving
1. **Check authentication**: Ensure user is properly authenticated
2. **Check form validation**: Verify required fields are filled
3. **Check database**: Confirm time_entries table exists and is accessible

### Performance Issues

**Issue**: Slow loading times
1. **Check database queries**: Look for N+1 query problems
2. **Check network requests**: Use browser DevTools to analyze API calls
3. **Check component re-renders**: Use React DevTools Profiler

### Development Environment Issues

**Issue**: Hot reload not working
```bash
# Restart the development server
npm run dev
```

**Issue**: TypeScript errors about imports
- **Use type-only imports**: `import type { ... }` for types and interfaces
- **Use regular imports**: `import { ... }` for runtime values
- See [TypeScript Import Rules](../README.md#typescript-configuration) for details

### Build and Deployment Issues

**Issue**: Build fails with type errors
```bash
# Run type checking
npm run build

# Fix any TypeScript errors before proceeding
```

**Issue**: Environment variables not working in production
1. **Check deployment platform**: Ensure environment variables are set correctly
2. **Check variable names**: Must start with `VITE_` for client-side access
3. **Check build process**: Verify variables are available during build time

## 🔧 Development Environment Setup

### Prerequisites Troubleshooting

**Node.js Version Issues**
- **Required**: Node.js 18+ recommended
- **Check version**: `node --version`
- **Update if needed**: Use nvm or download from nodejs.org

**Package Manager Issues**
```bash
# Clear npm cache if having issues
npm cache clean --force

# Or try with yarn if npm has issues
yarn install
yarn dev
```

### IDE and Editor Issues

**VSCode Setup**
1. **Install recommended extensions**:
   - ESLint
   - Prettier
   - TypeScript
   - Tailwind CSS IntelliSense

2. **Configure settings**: Ensure auto-format on save is enabled

**Type Checking in Editor**
- **Enable TypeScript checking**: Use `"typescript.validate.enable": true` in VSCode settings
- **Restart TypeScript server**: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

## 🛠 Advanced Troubleshooting

### Database Debugging

**Check database schema**:
```bash
# Connect to local database and inspect tables
npx supabase db shell
\d time_entries
```

**Check RLS policies**:
```sql
-- View current policies
SELECT * FROM pg_policies WHERE tablename = 'time_entries';
```

### Network Debugging

**API Call Debugging**:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by XHR/Fetch requests
4. Check request/response details for errors

### React Context Debugging

**Timer Context Issues**:
- Use React DevTools to inspect context values
- Check that components are wrapped in proper providers
- Verify context is not being consumed outside of provider

## 📞 Getting Help

If you're still experiencing issues:

1. **Check browser console** for JavaScript errors
2. **Check network tab** for failed API requests  
3. **Review recent changes** that might have caused the issue
4. **Test in incognito mode** to rule out browser extension conflicts
5. **Try a fresh install**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## 🔄 Migration and Upgrade Issues

### TailwindCSS v4 Migration

If migrating from v3, key changes:
1. **Remove** `tailwind.config.js`
2. **Replace** `@tailwind` directives with `@import "tailwindcss"`
3. **Update** Vite config to use `@tailwindcss/vite`
4. **No PostCSS config** needed (handled by Vite plugin)

**Auto Migration Tool**:
```bash
npx @tailwindcss/upgrade@next
```

### Dependency Update Issues

**Check for breaking changes**:
```bash
# Check outdated packages
npm outdated

# Update carefully, one package at a time
npm update package-name
```

---

For additional help, check the [main README](../README.md) or refer to the official documentation for each technology used in the stack. 