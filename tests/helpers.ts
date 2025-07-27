import fs from 'node:fs';
import path from 'node:path';
import {
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  expect,
  type Page,
} from '@playwright/test';
import { generateId } from 'ai';
import { ChatPage } from './pages/chat';
import { AuthPage } from './pages/auth';
import { getUnixTime } from 'date-fns';

import {
  addAllowedUserToDB,
  isEmailAllowedInDB,
  createUserInDB,
  deleteUserWithConstraints,
} from './helpers/database';

export type UserContext = {
  context: BrowserContext;
  page: Page;
  request: APIRequestContext;
};

export async function createAuthenticatedContext({
  browser,
  name,
  chatModel = 'chat-model',
}: {
  browser: Browser;
  name: string;
  chatModel?: 'chat-model' | 'chat-model-reasoning';
}): Promise<UserContext> {
  const directory = path.join(__dirname, '../playwright/.sessions');

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  const storageFile = path.join(directory, `${name}.json`);

  const context = await browser.newContext();
  const page = await context.newPage();

  const email = `test-${name}@playwright.com`;
  const password = generateId();

  await page.goto('http://localhost:3000/register');
  await page.getByPlaceholder('user@acme.com').click();
  await page.getByPlaceholder('user@acme.com').fill(email);
  await page.getByLabel('Password').click();
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign Up' }).click();

  await expect(page.getByTestId('toast')).toContainText(
    'Account created successfully!',
  );

  const chatPage = new ChatPage(page);
  await chatPage.createNewChat();
  await chatPage.chooseModelFromSelector('chat-model-reasoning');
  await expect(chatPage.getSelectedModel()).resolves.toEqual('Reasoning model');

  await page.waitForTimeout(1000);
  await context.storageState({ path: storageFile });
  await page.close();

  const newContext = await browser.newContext({ storageState: storageFile });
  const newPage = await newContext.newPage();

  return {
    context: newContext,
    page: newPage,
    request: newContext.request,
  };
}

export function generateRandomTestUser() {
  const email = `test-${getUnixTime(new Date())}@playwright.com`;
  const password = generateId();

  return {
    email,
    password,
  };
}

/**
 * Demo user credentials for testing
 */
export const DEMO_USER = {
  email: 'demo@demo.de',
  password: 'demo1234',
} as const;

/**
 * Complete workflow to setup and login as demo user
 * This function handles:
 * 1. Adding user to allowed list
 * 2. Registering the account (if not exists)
 * 3. Logging in
 * 4. Verifying login success
 */
export async function setupAndLoginDemoUser(page: Page): Promise<void> {
  // Use static imports to avoid dynamic import issues with TypeScript parameter properties
  const authPage = new AuthPage(page);

  try {
    // 1. Add demo user to allowed list (if not already there)
    const isAllowed = await isEmailAllowedInDB(DEMO_USER.email);
    console.log(`Checking if ${DEMO_USER.email} is allowed...`);
    if (!isAllowed) {
      await addAllowedUserToDB(DEMO_USER.email);
      console.log(`✅ Added ${DEMO_USER.email} to Allowed_User table`);

      // 2. Try to register (this might fail if user already exists, which is fine)
      try {
        await authPage.register(DEMO_USER.email, DEMO_USER.password);
        await authPage.expectToastToContain('Account created successfully!');
        console.log(`✅ Registered new account for ${DEMO_USER.email}`);
      } catch (error) {
        // User might already exist, try to login instead
        console.log(
          `ℹ️ Registration failed (user might exist): ${DEMO_USER.email}`,
        );
      }
    } else {
      console.log(`ℹ️ ${DEMO_USER.email} already exists in Allowed_User table`);

      // Try to Login
      await authPage.login(DEMO_USER.email, DEMO_USER.password);

      // 4. Verify login success
      await page.waitForURL('/');
      await expect(page.getByPlaceholder('Send a message...')).toBeVisible();
    }

    console.log(`✅ Successfully logged in as ${DEMO_USER.email}`);
  } catch (error) {
    console.error(`❌ Error during demo user setup and login:`, error);
    throw error;
  }
}

/**
 * Quick login function for demo user (assumes user is already set up)
 */
export async function loginDemoUser(page: Page): Promise<void> {
  const authPage = new AuthPage(page);

  try {
    await authPage.login(DEMO_USER.email, DEMO_USER.password);
    await page.waitForURL('/');
    await expect(page.getByPlaceholder('Send a message...')).toBeVisible();
    console.log(`✅ Logged in as ${DEMO_USER.email}`);
  } catch (error) {
    console.error(`❌ Error during demo user login:`, error);
    throw error;
  }
}

/**
 * Setup demo user in database (add to allowed list and register account)
 */
export async function setupDemoUser(): Promise<void> {
  try {
    // Add to allowed users if not already there
    const isAllowed = await isEmailAllowedInDB(DEMO_USER.email);
    if (!isAllowed) {
      await addAllowedUserToDB(DEMO_USER.email);
      console.log(`✅ Added ${DEMO_USER.email} to allowed users`);
    }

    // Create user account in database
    await createUserInDB(DEMO_USER.email, DEMO_USER.password);
    console.log(`✅ Created user account for ${DEMO_USER.email}`);
  } catch (error) {
    console.error(`❌ Error during demo user setup:`, error);
    throw error;
  }
}

/**
 * Clean up demo user from database (removes from allowed list and deletes account)
 */
export async function cleanupDemoUser(): Promise<void> {
  try {
    await deleteUserWithConstraints(DEMO_USER.email);
    console.log(`✅ Cleaned up demo user ${DEMO_USER.email}`);
  } catch (error) {
    console.error(`❌ Error during demo user cleanup:`, error);
    throw error;
  }
}
