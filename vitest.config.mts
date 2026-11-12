import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // MONGODB_URI comes from .env.local / the environment
  return {
    resolve: {
      alias: {
        '@': src,
        'server-only': fileURLToPath(new URL('./src/test/server-only.ts', import.meta.url)),
      },
    },
    test: {
      include: ['src/**/*.test.ts'],
      testTimeout: 30_000,
      env: {
        SESSION_SECRET: 'x'.repeat(40),
        ADMIN_EMAIL_DOMAINS: 'kanaku.com',
        ...(env.MONGODB_URI ? { MONGODB_URI: env.MONGODB_URI } : {}),
      },
    },
  };
});
