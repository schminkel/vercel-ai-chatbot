import { expect, test } from '../fixtures';
import { AuthPage } from '../pages/auth';
import { generateRandomTestUser } from '../helpers';
import { ChatPage } from '../pages/chat';
import { getMessageByErrorCode } from '@/lib/errors';

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

    test('Setup demo user (add to allowed list and register)', async () => {
      const { setupDemoUser } = await import('../helpers');
      await setupDemoUser();
    });

    test('Register new account with existing email (error case)', async () => {
      const { DEMO_USER } = await import('../helpers');
      await authPage.register(DEMO_USER.email, DEMO_USER.password);
      await authPage.expectToastToContain('Account already exists!');
    });

    test('Log into account that exists', async ({ page }) => {
      const { loginDemoUser } = await import('../helpers');
      await loginDemoUser(page);
    });

    test('Display user email in user menu', async ({ page }) => {
      const { DEMO_USER, loginDemoUser } = await import('../helpers');
      await loginDemoUser(page);

      const userEmail = await page.getByTestId('user-email');
      await expect(userEmail).toHaveText(DEMO_USER.email);
    });

    test('Log out as user', async () => {
      const { DEMO_USER } = await import('../helpers');
      await authPage.logout(DEMO_USER.email, DEMO_USER.password);
    });

    test('Clean up demo user from database', async () => {
      const { cleanupDemoUser } = await import('../helpers');
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
  test('Add demo@demo.de to Allowed_User table', async () => {
    const { addAllowedUserToDB, isEmailAllowedInDB, removeAllowedUserFromDB, closeDatabaseConnection } = await import('../helpers/database');
    
    const testEmail = 'demo@demo.de';
    
    try {
      // Add the email to the database
      await addAllowedUserToDB(testEmail);
      
      // Verify the email was added
      const isAllowed = await isEmailAllowedInDB(testEmail);
      expect(isAllowed).toBe(true);
      
      console.log(`✅ Successfully added ${testEmail} to Allowed_User table`);
    } finally {
      // Clean up: remove the test email
      await removeAllowedUserFromDB(testEmail);
      
      // Verify cleanup worked
      const isAllowedAfterCleanup = await isEmailAllowedInDB(testEmail);
      expect(isAllowedAfterCleanup).toBe(false);
      
      // Close database connection
      await closeDatabaseConnection();
    }
  });

  test('Add demo@demo.de permanently to Allowed_User (no cleanup)', async () => {
    const { addAllowedUserToDB, isEmailAllowedInDB, closeDatabaseConnection } = await import('../helpers/database');
    
    const testEmail = 'demo@demo.de';
    
    // Add the email to the database
    await addAllowedUserToDB(testEmail);
    
    // Verify the email was added
    const isAllowed = await isEmailAllowedInDB(testEmail);
    expect(isAllowed).toBe(true);
    
    console.log(`✅ Successfully added ${testEmail} to Allowed_User table (permanent)`);
    
    // Close database connection
    await closeDatabaseConnection();
  });

  test('Remove demo@demo.de from Allowed_User table', async () => {
    const { removeAllowedUserFromDB, isEmailAllowedInDB, closeDatabaseConnection } = await import('../helpers/database');
    
    const testEmail = 'demo@demo.de';
    
    // Remove the email from the database
    await removeAllowedUserFromDB(testEmail);
    
    // Verify the email was removed
    const isAllowed = await isEmailAllowedInDB(testEmail);
    expect(isAllowed).toBe(false);
    
    console.log(`✅ Successfully removed ${testEmail} from Allowed_User table (permanent)`);
    
    // Close database connection
    await closeDatabaseConnection();
  });

  test('Delete user demo@demo.de with all constraints from database', async () => {
    const { 
      deleteUserWithConstraints, 
      getUserByEmail, 
      isEmailAllowedInDB,
      closeDatabaseConnection 
    } = await import('../helpers/database');
    
    const testEmail = 'demo@demo.de';
    
    try {
      // Check if user exists before deletion
      const userBefore = await getUserByEmail(testEmail);
      console.log(`User before deletion:`, userBefore ? 'EXISTS' : 'NOT FOUND');
      
      // Check if email is in allowed users before deletion
      const isAllowedBefore = await isEmailAllowedInDB(testEmail);
      console.log(`Email in allowed users before deletion: ${isAllowedBefore}`);
      
      // Delete user with all constraints
      await deleteUserWithConstraints(testEmail);
      
      // Verify user was deleted
      const userAfter = await getUserByEmail(testEmail);
      expect(userAfter).toBe(null);
      
      // Verify email was removed from allowed users
      const isAllowedAfter = await isEmailAllowedInDB(testEmail);
      expect(isAllowedAfter).toBe(false);
      
      console.log(`✅ Successfully deleted user ${testEmail} with all constraints`);
    } catch (error) {
      console.error(`❌ Error during user deletion:`, error);
      throw error;
    } finally {
      // Close database connection
      await closeDatabaseConnection();
    }
  });

  test('Complete workflow: Create and delete demo@demo.de with all constraints', async () => {
    const { 
      addAllowedUserToDB,
      createUserInDB,
      deleteUserWithConstraints, 
      getUserByEmail, 
      isEmailAllowedInDB,
      closeDatabaseConnection 
    } = await import('../helpers/database');
    
    const testEmail = 'demo@demo.de';
    const testPassword = 'demo1234';
    
    try {
      // 1. Add to allowed users
      await addAllowedUserToDB(testEmail);
      console.log(`✅ Added ${testEmail} to allowed users`);
      
      // 2. Create user account
      const newUser = await createUserInDB(testEmail, testPassword);
      console.log(`✅ Created user account for ${testEmail}`, newUser ? 'SUCCESS' : 'ALREADY EXISTS');
      
      // 3. Verify user exists
      const userExists = await getUserByEmail(testEmail);
      expect(userExists).not.toBe(null);
      
      // 4. Verify email is allowed
      const isAllowed = await isEmailAllowedInDB(testEmail);
      expect(isAllowed).toBe(true);
      
      console.log(`✅ User ${testEmail} created successfully`);
      
      // 5. Delete user with all constraints
      await deleteUserWithConstraints(testEmail);
      
      // 6. Verify complete deletion
      const userAfterDeletion = await getUserByEmail(testEmail);
      expect(userAfterDeletion).toBe(null);
      
      const isAllowedAfterDeletion = await isEmailAllowedInDB(testEmail);
      expect(isAllowedAfterDeletion).toBe(false);
      
      console.log(`✅ Successfully completed full workflow for ${testEmail}`);
    } catch (error) {
      console.error(`❌ Error during workflow:`, error);
      throw error;
    } finally {
      // Close database connection
      await closeDatabaseConnection();
    }
  });
});
