import { expect, type Page, test } from '@playwright/test';
import type { ChatPage } from '../pages/chat';

export async function deleteAllSuggestedActionsAndCreateDefaultSet(
  page: Page,
  chatPage: ChatPage,
): Promise<void> {
  // Set extended timeout for this test (180 seconds)
  test.setTimeout(180000);

  console.log('💬 Creating new chat...');
  await chatPage.createNewChat();

  console.log('⏳ Waiting for suggested actions container...');
  await chatPage.isElementVisible('suggested-actions');

  console.log('📝 Waiting for prompts to load...');
  await chatPage.waitForPromptsToLoad();

  // Get initial count and prompts
  const initialCount = await chatPage.promptCards.count();
  const initialTitles = await chatPage.getPromptCardTitles();
  console.log(`🔍 Initial prompt count: ${initialCount}`);
  console.log(`📝 Initial prompts: ${JSON.stringify(initialTitles, null, 2)}`);

  // Delete all prompts one by one
  let currentCount = initialCount;
  let deletedCount = 0;

  console.log('🗑️ Phase 1: Deleting all existing prompts...');

  while (currentCount > 0) {
    try {
      // Always work with the first card to maintain consistency
      const firstCard = chatPage.promptCards.first();

      // Ensure the card exists before proceeding
      await expect(firstCard).toBeVisible({ timeout: 5000 });

      const menuButton = firstCard.locator('button[aria-haspopup="menu"]');
      await menuButton.click();

      // Click delete option
      const deleteOption = page
        .locator('[role="menuitem"]:has-text("Delete")')
        .or(page.locator('button:has-text("Delete")'))
        .or(page.locator('[data-testid*="delete"]'));
      await deleteOption.first().click();

      // Confirm deletion
      const confirmButton = page
        .locator('button:has-text("Confirm")')
        .or(page.locator('button:has-text("Yes")'))
        .or(page.locator('button:has-text("Delete")'));
      await confirmButton.first().click();

      // Wait for deletion to complete
      await page.waitForTimeout(1000);
      await chatPage.waitForPromptsToLoad();

      // Verify count decreased
      const newCount = await chatPage.promptCards.count();
      if (newCount < currentCount) {
        deletedCount++;
        currentCount = newCount;

        // Log progress every 5 deletions
        if (deletedCount % 5 === 0) {
          console.log(
            `✅ Progress: ${deletedCount} prompts deleted (${currentCount} remaining)`,
          );
        }
      } else {
        console.log(
          `⚠️ Warning: Count did not decrease, breaking deletion loop`,
        );
        break;
      }
    } catch (error) {
      console.log(`❌ Failed to delete prompt: ${error}`);
      break;
    }

    // Small delay to prevent overwhelming the UI
    await page.waitForTimeout(200);
  }

  console.log(
    `🔍 Deletion complete. Deleted ${deletedCount} prompts, ${currentCount} remaining`,
  );
  console.log('### Phase 1: Deletion completed');

  // Expected default prompts that should be recreated
  const expectedDefaultPrompts = [
    'E-Mail-Optimizer',
    'Write code to',
    'Help me write an essay',
    'What is the weather',
    'Code Review Assistant',
    'Technical Documentation',
    'SQL Query Helper',
    'Debug Assistant',
  ];

  console.log('\n📚 Phase 2: Creating default prompts...');

  // Create default prompts one by one
  let createdCount = 0;
  let failedCreations = 0;

  for (const promptTitle of expectedDefaultPrompts) {
    try {
      console.log(`📝 Creating prompt: ${promptTitle}`);

      // Click "Add Prompt" button
      const addButton = page.locator('button:has-text("Add Prompt")');
      await addButton.click();

      // Fill out the form with default prompt data
      const titleInput = page.locator('input[id="title"]').first();
      const contentInput = page.locator('textarea[id="prompt"]').first();

      await titleInput.fill(promptTitle);

      // Use appropriate content based on the title
      let promptContent = '';
      switch (promptTitle) {
        case 'E-Mail-Optimizer':
          promptContent =
            'Optimiere den Text hinsichtlich Rechtschreibung und Grammatik. Führe nur leichte Anpassungen durch um die Verständlichkeit zu verbessern. Liste die Anpassungen kurz auf und gebe das Ergebnis in einen Code block zum leichten kopieren.';
          break;
        case 'Write code to':
          promptContent = "Write code to demonstrate djikstra's algorithm";
          break;
        case 'Help me write an essay':
          promptContent = 'Help me write an essay about silicon valley';
          break;
        case 'What is the weather':
          promptContent = 'What is the weather in San Francisco?';
          break;
        case 'Code Review Assistant':
          promptContent =
            'Please review the following code for best practices, potential bugs, performance improvements, and security issues. Provide specific suggestions with explanations.';
          break;
        case 'Technical Documentation':
          promptContent =
            'Help me create comprehensive technical documentation for the following code or system. Include usage examples, API references, and setup instructions.';
          break;
        case 'SQL Query Helper':
          promptContent =
            'Help me write efficient SQL queries. Explain the query structure and suggest optimizations if needed.';
          break;
        case 'Debug Assistant':
          promptContent =
            'Help me debug this code issue. Analyze the error, identify the root cause, and provide a solution with explanation.';
          break;
        default:
          promptContent = `Default prompt content for ${promptTitle}`;
      }

      await contentInput.fill(promptContent);

      // Submit the form
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.first().click();

      // Wait for creation to complete
      await page.waitForTimeout(1000);
      await chatPage.waitForPromptsToLoad();

      createdCount++;
      console.log(`✅ Created prompt: ${promptTitle}`);
    } catch (error) {
      console.log(`❌ Failed to create prompt "${promptTitle}": ${error}`);
      failedCreations++;

      // Try to close any open dialogs and continue
      try {
        const cancelButton = page.locator('button:has-text("Cancel")');
        await cancelButton.first().click({ timeout: 1000 });
      } catch (closeError) {
        // Ignore close errors
      }
    }

    // Small delay between creations
    await page.waitForTimeout(300);
  }

  console.log('### Phase 2: Creation completed');

  // Final verification
  const finalCount = await chatPage.promptCards.count();
  const finalTitles = await chatPage.getPromptCardTitles();

  console.log(`\n=== RESET TO DEFAULTS SUMMARY ===`);
  console.log(`🔍 Initial prompt count: ${initialCount}`);
  console.log(`🗑️ Prompts deleted: ${deletedCount}`);
  console.log(`📝 Prompts created: ${createdCount}`);
  console.log(`❌ Failed creations: ${failedCreations}`);
  console.log(`🔍 Final prompt count: ${finalCount}`);
  console.log(`📝 Final prompts: ${JSON.stringify(finalTitles, null, 2)}`);

  // Verify that we have successfully reset to default prompts
  expect(createdCount).toBeGreaterThanOrEqual(6); // At least 6 out of 8 defaults created
  expect(finalCount).toBeGreaterThanOrEqual(6); // At least 6 prompts total
  expect(failedCreations).toBeLessThanOrEqual(2); // Allow up to 2 failures

  // Verify that some expected default prompts exist
  const hasEssentialPrompts = expectedDefaultPrompts
    .slice(0, 4)
    .some((title) =>
      finalTitles.some((finalTitle) => finalTitle.includes(title)),
    );
  expect(hasEssentialPrompts).toBeTruthy();
}
