import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'max-lines': ['error', { max: 500, skipBlankLines: false, skipComments: false }],
    },
  },
  {
    // Presentation code must go through the BFF, never straight to backends.
    files: ['src/features/**/components/**', 'src/components/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['@/services/*'] }],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
