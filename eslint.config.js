import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'node_modules', '.next']),

  tseslint.configs.recommended,

  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' },
      ],
      // Flags standard data-fetching effects (loading spinners around an
      // awaited fetch). React's own docs accept this pattern; v7 of the
      // plugin ships it as an experiment. Revisit when the ecosystem lands
      // on a canonical fetch primitive.
      'react-hooks/set-state-in-effect': 'off',
    },
  },

  // Next.js App Router files legitimately export `metadata`,
  // `generateMetadata`, `revalidate`, `viewport` and route handlers alongside
  // the page component — react-refresh's "only components" rule does not
  // apply to them.
  {
    files: [
      'src/app/**/page.tsx',
      'src/app/**/layout.tsx',
      'src/app/**/route.ts',
      'src/app/**/not-found.tsx',
      'src/app/**/error.tsx',
      'src/app/**/loading.tsx',
      'src/app/robots.ts',
      'src/app/sitemap.ts',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]);
