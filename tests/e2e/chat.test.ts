import { ChatPage } from '../pages/chat';
import { test, expect } from '../fixtures';
import { setupAndLoginDemoUser } from '../helpers';

test.describe
  .serial('Chat activity', () => {
    let chatPage: ChatPage;

    test.beforeEach(async ({ page }) => {
      chatPage = new ChatPage(page);
      await chatPage.createNewChat();
      // Login as demo user to access custom prompts functionality
      console.log('🔐 Logging in as demo user...');
      await setupAndLoginDemoUser(page);
      console.log('✅ Demo user login completed');
    });

    test('Send a user message and receive response', async () => {
      await chatPage.selectModelById('openai-gpt-4.1-nano');
      await chatPage.sendUserMessage('Why is grass green?');
      await chatPage.isGenerationComplete();
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content).toContain('Why is grass green?');
      console.log('✅ Assistant response received:', assistantMessage.content);
    });

    test('Redirect to /chat/:id after submitting message', async () => {
      await chatPage.sendUserMessage('Why is grass green?');
      await chatPage.isGenerationComplete();
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content).toContain('Why is grass green?');
      await chatPage.hasChatIdInUrl();
      console.log('✅ Redirected to /chat/:id after submitting message');
    });

    test('Send a user message from suggestion', async () => {
      await chatPage.sendUserMessageFromSuggestion();
      await chatPage.sendUserMessageWithEnter();
      await chatPage.isGenerationComplete();
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      console.log(
        '✅ Assistant response from suggestion:',
        assistantMessage.content,
      );
    });

    test('Toggle between send/stop button based on activity', async () => {
      await expect(chatPage.sendButton).toBeVisible();
      await expect(chatPage.sendButton).toBeDisabled();
      await chatPage.sendUserMessage('Why is grass green?');
      await expect(chatPage.sendButton).not.toBeVisible();
      await expect(chatPage.stopButton).toBeVisible();
      await chatPage.isGenerationComplete();
      await expect(chatPage.stopButton).not.toBeVisible();
      await expect(chatPage.sendButton).toBeVisible();
      console.log('✅ Send/stop button toggling works as expected');
    });

    test('Stop generation during submission', async () => {
      await chatPage.sendUserMessage('Why is grass green?');
      await expect(chatPage.stopButton).toBeVisible();
      await chatPage.stopButton.click();
      await expect(chatPage.sendButton).toBeVisible();
      console.log('✅ Stopped generation successfully');
    });

    // test('Edit user message and resubmit', async () => {
    //   await chatPage.sendUserMessage('Why is grass green?');
    //   await chatPage.isGenerationComplete();
    //   const assistantMessage = await chatPage.getRecentAssistantMessage();
    //   expect(assistantMessage.content).toContain("It's just green duh!");
    //   const userMessage = await chatPage.getRecentUserMessage();
    //   await userMessage.edit('Why is the sky blue?');
    //   await chatPage.isGenerationComplete();
    //   const updatedAssistantMessage = await chatPage.getRecentAssistantMessage();
    //   expect(updatedAssistantMessage.content).toContain("It's just blue duh!");
    // });

    test('Hide suggested actions after sending message', async () => {
      await chatPage.isElementVisible('suggested-actions');
      await chatPage.sendUserMessageFromSuggestion();
      await chatPage.sendUserMessageWithEnter();
      await chatPage.isElementNotVisible('suggested-actions');
      console.log('✅ Suggested actions hidden after sending message');
    });

    test('Upload file and send image attachment with message', async () => {
      await chatPage.addImageAttachment();
      await chatPage.isElementVisible('attachments-preview');
      await chatPage.isElementVisible('input-attachment-loader');
      await chatPage.isElementNotVisible('input-attachment-loader');
      await chatPage.sendUserMessage('Who painted this?');
      const userMessage = await chatPage.getRecentUserMessage();
      expect(userMessage.attachments).toHaveLength(1);
      await chatPage.isGenerationComplete();
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content).toContain('Who painted this?');
      console.log('✅ Image attachment sent successfully with message');
    });

    // test('Call weather tool', async () => {
    //   await chatPage.sendUserMessage("What's the weather in sf?");
    //   await chatPage.isGenerationComplete();
    //   const assistantMessage = await chatPage.getRecentAssistantMessage();
    //   expect(assistantMessage.content).toBe(
    //     'The current temperature in San Francisco is 17°C.',
    //   );
    // });

    test('Upvote message', async () => {
      await chatPage.sendUserMessage('Why is the sky blue?');
      await chatPage.isGenerationComplete();
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      await assistantMessage.upvote();
      await chatPage.isVoteComplete();
      console.log('✅ Upvoted message successfully:', assistantMessage.content);
    });

    test('Downvote message', async () => {
      await chatPage.sendUserMessage('Why is the sky blue?');
      await chatPage.isGenerationComplete();
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      await assistantMessage.downvote();
      await chatPage.isVoteComplete();
      console.log(
        '✅ Downvoted message successfully:',
        assistantMessage.content,
      );
    });

    test('Update vote', async () => {
      await chatPage.sendUserMessage('Why is the sky blue?');
      await chatPage.isGenerationComplete();
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      await assistantMessage.upvote();
      await chatPage.isVoteComplete();
      await assistantMessage.downvote();
      await chatPage.isVoteComplete();
      console.log('✅ Updated vote successfully:', assistantMessage.content);
    });

    test('Create message from url query', async ({ page }) => {
      await page.goto('/?query=Why is the sky blue?');
      await chatPage.isGenerationComplete();
      const userMessage = await chatPage.getRecentUserMessage();
      expect(userMessage.content).toBe('Why is the sky blue?');
      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content).toContain('Why is the sky blue?');
      console.log(
        '✅ Created message from URL query successfully:',
        userMessage.content,
      );
    });

    test('Auto-scrolls to bottom after submitting new messages', async () => {
      await chatPage.sendMultipleMessages(10, (i) => `filling message #${i}`);
      await chatPage.waitForScrollToBottom();
      console.log('✅ Auto-scroll to bottom after submitting messages works');
    });

    test('Scroll button appears when user scrolls up, hides on click', async () => {
      await chatPage.sendMultipleMessages(10, (i) => `filling message #${i}`);
      await expect(chatPage.scrollToBottomButton).not.toBeVisible();
      await chatPage.scrollToTop();
      await expect(chatPage.scrollToBottomButton).toBeVisible();
      await chatPage.scrollToBottomButton.click();
      await chatPage.waitForScrollToBottom();
      await expect(chatPage.scrollToBottomButton).not.toBeVisible();
      console.log(
        '✅ Scroll to bottom button appears when scrolling up and hides on click',
      );
    });

    test('Create, rename, and delete chat', async () => {
      // Create a new chat by sending a message
      await chatPage.sendUserMessage('This is a test chat');
      await chatPage.isGenerationComplete(); // does not work in debug mode
      console.log('🔄 Chat created by sending a message');

      // Get the chat ID from the URL
      const chatId = await chatPage.getChatIdFromUrl();
      console.log('🔄 Created chat with ID:', chatId);

      // Open sidebar to access chat management
      await chatPage.openSidebar();
      console.log('🔄 Opening sidebar to manage chats...');

      // Open the chat menu (three dots)
      await chatPage.openChatMenu(chatId);
      console.log('🔄 Opening chat menu for renaming...');

      // Click rename option
      await chatPage.renameChatFromMenu();
      console.log('🔄 Clicked rename option in chat menu');

      // Fill in new title and submit
      const newTitle = 'Renamed Test Chat';
      await chatPage.fillRenameDialog(newTitle);
      await chatPage.submitRenameDialog();
      console.log('🔄 Submitted rename dialog with new title:', newTitle);

      // Wait for rename to complete
      await chatPage.waitForRenameComplete();
      console.log('🔄 Waiting for rename to complete...');

      // check toast message appears
      await chatPage.expectToastToContain('Chat renamed successfully');
      console.log('🔄 Toast message for chat renaming is visible');

      // Verify the chat title has been updated in the sidebar
      const updatedTitle = await chatPage.getChatTitleFromSidebar(chatId);
      expect(updatedTitle.trim()).toBe(newTitle);
      console.log('✅ Chat renamed successfully to:', newTitle);

      // Open the chat menu again for deletion
      await chatPage.openChatMenu(chatId);
      console.log('🔄 Opening chat menu for deletion...');

      // Click delete option
      await chatPage.deleteChatFromMenu();
      console.log('🔄 Clicked delete option in chat menu');

      // Confirm deletion
      await chatPage.confirmDeleteDialog();
      console.log('🔄 Confirmed chat deletion');

      // check toast message appears
      await chatPage.expectToastToContain('Chat deleted successfully');
      console.log('🔄 Toast message for chat deletion is visible');

      console.log('✅ Chat deleted successfully and redirected to home');
    });

    test('Create 100 chats', async () => {
      // Array to store created chat IDs for verification
      const createdChatIds: string[] = [];

      console.log('🔄 Starting to create 20 chats...');

      for (let i = 1; i <= 100; i++) {
        console.log(`🔄 Creating chat ${i}/20...`);

        // Navigate to home to start a new chat
        await chatPage.createNewChat();

        // Send a unique message for each chat
        const message = `Test chat number ${i} of 20`;
        await chatPage.sendUserMessage(message);
        await chatPage.isGenerationComplete();

        // Get the chat ID from URL and store it
        const chatId = await chatPage.getChatIdFromUrl();
        createdChatIds.push(chatId);

        console.log(`✅ Created chat ${i}/100 with ID: ${chatId}`);

        // Verify the message was sent correctly
        const userMessage = await chatPage.getRecentUserMessage();
        expect(userMessage.content).toBe(message);

        const assistantMessage = await chatPage.getRecentAssistantMessage();
        expect(assistantMessage.content).toContain(message);

        // Small delay between chat creations to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log('✅ Successfully created all 100 chats');

      // Verify all chats were created by checking the sidebar
      await chatPage.openSidebar();
      const sidebarChatIds = await chatPage.getAllChatIdsFromSidebar();

      // Verify that all created chat IDs are present in the sidebar
      for (const chatId of createdChatIds) {
        expect(sidebarChatIds).toContain(chatId);
      }

      console.log(
        `✅ Verified all 100 chats are present in sidebar. Total chats in sidebar: ${sidebarChatIds.length}`,
      );
      console.log('📊 Created chat IDs:', createdChatIds);
    });

    test('Delete all existing chats and create a new one', async () => {
      // Delete all existing chats first
      await chatPage.deleteAllExistingChats();
      console.log('🔄 All existing chats have been deleted');

      // Navigate to home page to ensure we're in a clean state
      await chatPage.createNewChat();
      console.log('🔄 Navigated to home page');

      // Create a new chat by sending a message
      await chatPage.sendUserMessage('This is a fresh new chat after cleanup');
      await chatPage.isGenerationComplete();
      console.log('🔄 New chat created successfully');

      // Get the chat ID from the URL to verify chat was created
      const newChatId = await chatPage.getChatIdFromUrl();
      console.log('🔄 New chat created with ID:', newChatId);

      // Verify we're on the correct chat page
      await chatPage.hasChatIdInUrl();
      console.log(
        '✅ Successfully created new chat after deleting all existing chats',
      );

      // Optionally verify the message was sent
      const userMessage = await chatPage.getRecentUserMessage();
      expect(userMessage.content).toBe(
        'This is a fresh new chat after cleanup',
      );

      const assistantMessage = await chatPage.getRecentAssistantMessage();
      expect(assistantMessage.content).toContain(
        'This is a fresh new chat after cleanup',
      );

      console.log('✅ New chat is working correctly with messages');
    });

    test('Validate model drop down', async ({ page }) => {
      // Import models and entitlements to validate against
      const { chatModels } = await import('@/lib/ai/models');
      const { entitlementsByUserType } = await import('@/lib/ai/entitlements');

      // Assume demo user has 'regular' user type - get available models
      const { availableChatModelIds } = entitlementsByUserType.regular;
      const expectedModels = chatModels.filter((model) =>
        availableChatModelIds.includes(model.id),
      );

      console.log('🔄 Opening model selector dropdown...');

      // Click the model selector button to open dropdown
      await page.getByTestId('model-selector').click();

      // Wait for dropdown menu to be visible
      await page.waitForSelector('[role="menu"]', { state: 'visible' });

      console.log('🔄 Validating all expected models are present...');

      // Get all model items in the dropdown
      const modelItems = await page
        .locator('[data-testid^="model-selector-item-"]')
        .all();

      // Check that we have the correct number of models
      expect(modelItems.length).toBe(expectedModels.length);
      console.log(
        `✅ Found ${modelItems.length} models in dropdown (expected ${expectedModels.length})`,
      );

      // Validate each model in the dropdown
      for (const expectedModel of expectedModels) {
        console.log(
          `🔄 Validating model: ${expectedModel.name} (${expectedModel.id})`,
        );

        const modelItem = page.getByTestId(
          `model-selector-item-${expectedModel.id}`,
        );

        // Check that the model item exists and is visible
        await expect(modelItem).toBeVisible();

        // Check model name in the span with text-left class
        const modelNameElement = modelItem.locator('span.text-left').first();
        await expect(modelNameElement).toHaveText(expectedModel.name);

        // Check model description (hidden on small screens, visible on sm and larger)
        const descriptionElement = modelItem.locator(
          '.hidden.sm\\:block.text-xs.text-muted-foreground',
        );
        if ((await descriptionElement.count()) > 0) {
          await expect(descriptionElement).toContainText(
            expectedModel.description,
          );
        }

        // Check input types in the IN: section
        const inputSection = modelItem.locator(
          '.flex.items-center.gap-1:has(span:text("IN:"))',
        );
        if (expectedModel.inputTypes && expectedModel.inputTypes.length > 0) {
          for (const inputType of expectedModel.inputTypes) {
            await expect(inputSection).toContainText(inputType);
          }
        }

        // Check output types in the OUT: section
        const outputSection = modelItem.locator(
          '.flex.items-center.gap-1:has(span:text("OUT:"))',
        );
        if (expectedModel.outputTypes && expectedModel.outputTypes.length > 0) {
          for (const outputType of expectedModel.outputTypes) {
            await expect(outputSection).toContainText(outputType);
          }
        }

        // Check cost rating coins are present
        const coinIcons = modelItem.locator('svg.coin-icon');
        const coinCount = await coinIcons.count();
        expect(coinCount).toBeGreaterThanOrEqual(1);

        // For image models, check fixed cost display
        if (expectedModel.costRating.fixedCost) {
          const fixedCostText = `${expectedModel.costRating.fixedCost.toFixed(2)} € per image`;
          await expect(modelItem).toContainText(fixedCostText);
        }

        // Check provider icon is present in the shrink-0 div
        const providerIcon = modelItem.locator('.shrink-0 svg').first();
        await expect(providerIcon).toBeVisible();

        // Check that checkmark container exists (for selection indicator)
        const checkmarkContainer = modelItem.locator(
          '.opacity-0.group-data-\\[active\\=true\\]\\/item\\:opacity-100',
        );
        await expect(checkmarkContainer).toBeAttached();

        // Verify role="menuitem" attribute
        await expect(modelItem).toHaveAttribute('role', 'menuitem');

        console.log(`✅ Model ${expectedModel.name} validation completed`);
      }

      // Close the dropdown by pressing Escape
      await page.keyboard.press('Escape');

      // Wait for dropdown to be hidden
      await page.waitForSelector('[role="menu"]', { state: 'hidden' });

      console.log('✅ Model dropdown validation completed successfully');
    });
  });
