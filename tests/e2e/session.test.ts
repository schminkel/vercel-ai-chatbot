import { expect, test } from '../fixtures';
import { AuthPage } from '../pages/auth';
import {
  generateRandomTestUser,
  setupDemoUser,
  DEMO_USER,
  loginDemoUser,
  cleanupDemoUser,
} from '../helpers';
import {
  addAllowedUserToDB,
  isEmailAllowedInDB,
  removeAllowedUserFromDB,
  closeDatabaseConnection,
  deleteUserWithConstraints,
  getUserByEmail,
  createUserInDB,
} from '../helpers/database';

// test.describe
//   .serial('Guest Session', () => {
//     test('Authenticate as guest user when a new session is loaded', async ({
//       page,
//     }) => {
//       const response = await page.goto('/');

//       if (!response) {
//         throw new Error('Failed to load page');
//       }

//       let request: any = response.request();

//       const chain = [];

//       while (request) {
//         chain.unshift(request.url());
//         const redirectedFrom = request.redirectedFrom();
//         request = redirectedFrom || null;
//       }

//       expect(chain).toEqual([
//         'http://localhost:3000/',
//         'http://localhost:3000/api/auth/guest?redirectUrl=http%3A%2F%2Flocalhost%3A3000%2F',
//         'http://localhost:3000/',
//       ]);
//     });

//     test('Log out is not available for guest users', async ({ page }) => {
//       await page.goto('/');

//       const sidebarToggleButton = page.getByTestId('sidebar-toggle-button');
//       await sidebarToggleButton.click();

//       const userNavButton = page.getByTestId('user-nav-button');
//       await expect(userNavButton).toBeVisible();

//       await userNavButton.click();
//       const userNavMenu = page.getByTestId('user-nav-menu');
//       await expect(userNavMenu).toBeVisible();

//       const authMenuItem = page.getByTestId('user-nav-item-auth');
//       await expect(authMenuItem).toContainText('Login to your account');
//     });

//     test('Do not authenticate as guest user when an existing non-guest session is active', async ({
//       adaContext,
//     }) => {
//       const response = await adaContext.page.goto('/');

//       if (!response) {
//         throw new Error('Failed to load page');
//       }

//       let request: any = response.request();

//       const chain = [];

//       while (request) {
//         chain.unshift(request.url());
//         request = request.redirectedFrom();
//       }

//       expect(chain).toEqual(['http://localhost:3000/']);
//     });

//     test('Allow navigating to /login as guest user', async ({ page }) => {
//       await page.goto('/login');
//       await page.waitForURL('/login');
//       await expect(page).toHaveURL('/login');
//     });

//     test('Allow navigating to /register as guest user', async ({ page }) => {
//       await page.goto('/register');
//       await page.waitForURL('/register');
//       await expect(page).toHaveURL('/register');
//     });

//     test('Do not show email in user menu for guest user', async ({ page }) => {
//       await page.goto('/');

//       const sidebarToggleButton = page.getByTestId('sidebar-toggle-button');
//       await sidebarToggleButton.click();

//       const userEmail = page.getByTestId('user-email');
//       await expect(userEmail).toContainText('Guest');
//     });
//   });

test.describe
  .serial('Login and Registration', () => {
    let authPage: AuthPage;
    const testUser = generateRandomTestUser();

    test.beforeEach(async ({ page }) => {
      authPage = new AuthPage(page);
    });

    test('Setup demo@demo.de user (add to allowed list and register)', async () => {
      await setupDemoUser();
      console.log(`✅ Demo user setup completed: ${DEMO_USER.email}`);
    });

    test('Register new account with existing email (error case)', async () => {
      await authPage.register(DEMO_USER.email, DEMO_USER.password);
      await authPage.expectToastToContain('Account already exists!');
      console.log(
        `✅ Registration failed for existing user: ${DEMO_USER.email}`,
      );
    });

    test('Log into account that exists', async ({ page }) => {
      await loginDemoUser(page);
      console.log(`✅ Successfully logged in as ${DEMO_USER.email}`);
    });

    test('Display user email in user menu', async ({ page }) => {
      await loginDemoUser(page);
      const userEmail = await page.getByTestId('user-email');
      await expect(userEmail).toHaveText(DEMO_USER.email);
      console.log(`✅ User email displayed: ${DEMO_USER.email}`);
    });

    test('Log out as user', async () => {
      await authPage.logout(DEMO_USER.email, DEMO_USER.password);
    });

    test('Clean up demo user from database', async () => {
      await cleanupDemoUser();
    });

    // test('Do not force create a guest session if non-guest session already exists', async ({
    //   page,
    // }) => {
    //   await authPage.login(testUser.email, testUser.password);
    //   await page.waitForURL('/');

    //   const userEmail = await page.getByTestId('user-email');
    //   await expect(userEmail).toHaveText(testUser.email);

    //   await page.goto('/api/auth/guest');
    //   await page.waitForURL('/');

    //   const updatedUserEmail = await page.getByTestId('user-email');
    //   await expect(updatedUserEmail).toHaveText(testUser.email);
    // });

    // test('Log out is available for non-guest users', async ({ page }) => {
    //   await authPage.login(testUser.email, testUser.password);
    //   await page.waitForURL('/');

    //   authPage.openSidebar();

    //   const userNavButton = page.getByTestId('user-nav-button');
    //   await expect(userNavButton).toBeVisible();

    //   await userNavButton.click();
    //   const userNavMenu = page.getByTestId('user-nav-menu');
    //   await expect(userNavMenu).toBeVisible();

    //   const authMenuItem = page.getByTestId('user-nav-item-auth');
    //   await expect(authMenuItem).toContainText('Sign out');
    // });

    // test('Do not navigate to /register for non-guest users', async ({
    //   page,
    // }) => {
    //   await authPage.login(testUser.email, testUser.password);
    //   await page.waitForURL('/');

    //   await page.goto('/register');
    //   await expect(page).toHaveURL('/');
    // });

    // test('Do not navigate to /login for non-guest users', async ({ page }) => {
    //   await authPage.login(testUser.email, testUser.password);
    //   await page.waitForURL('/');

    //   await page.goto('/login');
    //   await expect(page).toHaveURL('/');
    // });
  });

// test.describe('Entitlements', () => {
//   let chatPage: ChatPage;

//   test.beforeEach(async ({ page }) => {
//     chatPage = new ChatPage(page);
//   });

//   test('Guest user cannot send more than 20 messages/day', async () => {
//     test.fixme();
//     await chatPage.createNewChat();

//     for (let i = 0; i <= 20; i++) {
//       await chatPage.sendUserMessage('Why is the sky blue?');
//       await chatPage.isGenerationComplete();
//     }

//     await chatPage.sendUserMessage('Why is the sky blue?');
//     await chatPage.expectToastToContain(
//       getMessageByErrorCode('rate_limit:chat'),
//     );
//   });
// });

test.describe('Database Operations', () => {
  // Use unique test emails to avoid conflicts
  const generateTestEmail = () =>
    `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.de`;

  test.beforeEach(async () => {
    // Add a longer delay between tests to avoid connection issues
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  test.afterAll(async () => {
    // Close connection only once at the end
    await closeDatabaseConnection();
  });

  test('Add email to Allowed_User table', async () => {
    const testEmail = generateTestEmail();

    try {
      // Add the email to the database
      await addAllowedUserToDB(testEmail);

      // Add wait state to ensure operation completes
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify the email was added
      const isAllowed = await isEmailAllowedInDB(testEmail);
      expect(isAllowed).toBe(true);

      console.log(`✅ Successfully added ${testEmail} to Allowed_User table`);
    } finally {
      // Clean up: remove the test email
      await removeAllowedUserFromDB(testEmail);

      // Add wait state after cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify cleanup worked
      const isAllowedAfterCleanup = await isEmailAllowedInDB(testEmail);
      expect(isAllowedAfterCleanup).toBe(false);
    }
  });

  test('Remove demo@demo.de from Allowed_User table', async () => {
    const testEmail = 'demo@demo.de';

    // Check initial state
    const initiallyAllowed = await isEmailAllowedInDB(testEmail);
    console.log(
      `Initial state: ${testEmail} is ${initiallyAllowed ? 'allowed' : 'not allowed'}`,
    );

    // If email doesn't exist, add it first so we can test removal
    if (!initiallyAllowed) {
      await addAllowedUserToDB(testEmail);
      await new Promise((resolve) => setTimeout(resolve, 50));
      console.log(`Added ${testEmail} for removal test`);
    }

    // Remove the email from the database
    await removeAllowedUserFromDB(testEmail);

    // Add wait state
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify the email was removed
    const isAllowed = await isEmailAllowedInDB(testEmail);
    expect(isAllowed).toBe(false);

    console.log(`✅ Successfully removed ${testEmail} from Allowed_User table`);
  });

  test('Delete user with all constraints from database', async () => {
    const testEmail = generateTestEmail();

    try {
      // First ensure user exists by creating one
      await addAllowedUserToDB(testEmail);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const newUser = await createUserInDB(testEmail, 'test1234');
      if (!newUser) {
        throw new Error('Failed to create test user');
      }
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check if user exists before deletion
      const userBefore = await getUserByEmail(testEmail);
      console.log(`User before deletion:`, userBefore ? 'EXISTS' : 'NOT FOUND');

      // Check if email is in allowed users before deletion
      const isAllowedBefore = await isEmailAllowedInDB(testEmail);
      console.log(`Email in allowed users before deletion: ${isAllowedBefore}`);

      // Delete user with all constraints
      await deleteUserWithConstraints(testEmail);

      // Add wait state for complex deletion
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify user was deleted
      const userAfter = await getUserByEmail(testEmail);
      expect(userAfter).toBe(null);

      // Verify email was removed from allowed users
      const isAllowedAfter = await isEmailAllowedInDB(testEmail);
      expect(isAllowedAfter).toBe(false);

      console.log(
        `✅ Successfully deleted user ${testEmail} with all constraints`,
      );
    } catch (error) {
      console.error(`❌ Error during user deletion:`, error);
      throw error;
    }
  });

  test('Complete workflow: Create and delete user with all constraints', async () => {
    const testEmail = generateTestEmail();
    const testPassword = 'test1234';

    try {
      // 1. Add to allowed users
      await addAllowedUserToDB(testEmail);
      await new Promise((resolve) => setTimeout(resolve, 50));
      console.log(`✅ Added ${testEmail} to allowed users`);

      // 2. Create user account
      const newUser = await createUserInDB(testEmail, testPassword);
      await new Promise((resolve) => setTimeout(resolve, 50));
      console.log(
        `✅ Created user account for ${testEmail}`,
        newUser ? 'SUCCESS' : 'ALREADY EXISTS',
      );

      // 3. Verify user exists
      const userExists = await getUserByEmail(testEmail);
      expect(userExists).not.toBe(null);

      // 4. Verify email is allowed
      const isAllowed = await isEmailAllowedInDB(testEmail);
      expect(isAllowed).toBe(true);

      console.log(`✅ User ${testEmail} created successfully`);

      // 5. Delete user with all constraints
      await deleteUserWithConstraints(testEmail);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 6. Verify complete deletion
      const userAfterDeletion = await getUserByEmail(testEmail);
      expect(userAfterDeletion).toBe(null);

      const isAllowedAfterDeletion = await isEmailAllowedInDB(testEmail);
      expect(isAllowedAfterDeletion).toBe(false);

      console.log(`✅ Successfully completed full workflow for ${testEmail}`);
    } catch (error) {
      console.error(`❌ Error during workflow:`, error);
      throw error;
    }
  });
});
