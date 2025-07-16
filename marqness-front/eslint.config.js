import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

export default [
  {
    ignores: [
      "dist/**/*",
      "build/**/*", 
      "node_modules/**/*",
      "coverage/**/*",
      "*.min.js",
      "*.bundle.js"
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // Disable React in JSX scope rule for React 19
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      
      // Security: Require rel="noreferrer" for target="_blank"
      "react/jsx-no-target-blank": "error",
      
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },
];
