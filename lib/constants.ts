import { generateDummyPassword } from './db/utils';

// Dump all environment variables to the console on server start
if (!(globalThis as any).__envDumped) {
  (globalThis as any).__envDumped = true;
  const filteredEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('npm_package_'))
  );
  console.log('Environment Variables:', filteredEnv);
}

export const isHTTPSUsageEnabled = process.env.NEXT_PUBLIC_HTTPS_USAGE === 'true'
export const isProductionEnvironment = process.env.NODE_ENV === 'production';
export const isDevelopmentEnvironment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT,
);

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = generateDummyPassword();
