import { test, expect } from '../fixtures';
import { ChatPage } from '../pages/chat';

test.describe('Example: Using Demo User Helper Functions', () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
  });

  test('Quick login using helper function', async ({ page }) => {
    // Use the helper function to login as demo user
    const { loginDemoUser } = await import('../helpers');
    await loginDemoUser(page);
    
    // Now you're logged in and can test authenticated features
    await chatPage.createNewChat();
    await chatPage.isElementVisible('suggested-actions');
    
    // Your test logic here...
  });

  test('Full setup and login using helper function', async ({ page }) => {
    // Use the comprehensive helper that handles everything
    const { setupAndLoginDemoUser } = await import('../helpers');
    await setupAndLoginDemoUser(page);
    
    // Now you're logged in and the user is properly set up
    await chatPage.createNewChat();
    
    // Your test logic here...
  });

  test('Access demo user credentials', async () => {
    // Access the demo user credentials directly
    const { DEMO_USER } = await import('../helpers');
    
    expect(DEMO_USER.email).toBe('demo@demo.de');
    expect(DEMO_USER.password).toBe('demo1234');
    
    // Use these credentials as needed in your tests
  });

  test('Setup demo user in database only', async () => {
    // Just setup the user in database without UI interaction
    const { setupDemoUser } = await import('../helpers');
    await setupDemoUser();
    
    // User is now in database and allowed list
    // You can now use loginDemoUser() in subsequent tests
  });

  test('Clean up demo user after tests', async () => {
    // Clean up the demo user from database
    const { cleanupDemoUser } = await import('../helpers');
    await cleanupDemoUser();
    
    // Demo user is now removed from database and allowed list
  });
});
