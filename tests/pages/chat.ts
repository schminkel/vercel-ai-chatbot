import fs from 'node:fs';
import path from 'node:path';
import { chatModels } from '@/lib/ai/models';
import { expect, type Page } from '@playwright/test';
import { test } from '../fixtures';

export class ChatPage {
  constructor(private page: Page) {}

  public get sendButton() {
    return this.page.getByTestId('send-button');
  }

  public get stopButton() {
    return this.page.getByTestId('stop-button');
  }

  public get multimodalInput() {
    return this.page.getByTestId('multimodal-input');
  }

  public get scrollContainer() {
    return this.page.locator('.overflow-y-scroll');
  }

  public get scrollToBottomButton() {
    return this.page.getByTestId('scroll-to-bottom-button');
  }

  async createNewChat() {
    await this.page.goto('/');
  }

  public getCurrentURL(): string {
    return this.page.url();
  }

  async sendUserMessage(message: string) {
    await this.multimodalInput.click();
    await this.multimodalInput.fill(message);
    await this.sendButton.click();
  }

  async sendUserMessageWithEnter() {
    await this.multimodalInput.click();
    await this.page.keyboard.press('Enter');
  }

  async isGenerationComplete() {
    const response = await this.page.waitForResponse((response) =>
      response.url().includes('/api/chat'),
    );

    await response.finished();
  }

  async isVoteComplete() {
    const response = await this.page.waitForResponse((response) =>
      response.url().includes('/api/vote'),
    );

    await response.finished();
  }

  async hasChatIdInUrl() {
    await expect(this.page).toHaveURL(
      /^http:\/\/localhost:3000\/chat\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  }

  async sendUserMessageFromSuggestion() {
    await this.promptCards.first().click();
  }

  async isElementVisible(elementId: string) {
    await expect(this.page.getByTestId(elementId)).toBeVisible();
  }

  async isElementNotVisible(elementId: string) {
    await expect(this.page.getByTestId(elementId)).not.toBeVisible();
  }

  async addImageAttachment() {
    this.page.on('filechooser', async (fileChooser) => {
      const filePath = path.join(
        process.cwd(),
        'public',
        'images',
        'mouth of the seine, monet.jpg',
      );
      const imageBuffer = fs.readFileSync(filePath);

      await fileChooser.setFiles({
        name: 'mouth of the seine, monet.jpg',
        mimeType: 'image/jpeg',
        buffer: imageBuffer,
      });
    });

    await this.page.getByTestId('attachments-button').click();
  }

  public async getSelectedModel() {
    const modelId = await this.page.getByTestId('model-selector').innerText();
    return modelId;
  }

  public async chooseModelFromSelector(chatModelId: string) {
    const chatModel = chatModels.find(
      (chatModel) => chatModel.id === chatModelId,
    );

    if (!chatModel) {
      throw new Error(`Model with id ${chatModelId} not found`);
    }

    await this.page.getByTestId('model-selector').click();
    await this.page.getByTestId(`model-selector-item-${chatModelId}`).click();
    expect(await this.getSelectedModel()).toBe(chatModel.name);
  }

  public async getSelectedVisibility() {
    const visibilityId = await this.page
      .getByTestId('visibility-selector')
      .innerText();
    return visibilityId;
  }

  public async chooseVisibilityFromSelector(
    chatVisibility: 'public' | 'private',
  ) {
    await this.page.getByTestId('visibility-selector').click();
    await this.page
      .getByTestId(`visibility-selector-item-${chatVisibility}`)
      .click();
    expect(await this.getSelectedVisibility()).toBe(chatVisibility);
  }

  public async selectModelById(modelId: string) {
    await this.page.getByTestId('model-selector').click();
    await this.page.getByTestId(`model-selector-item-${modelId}`).click();
  }

  async getRecentAssistantMessage() {
    // Wait for at least one assistant message to exist
    await this.page.waitForSelector('[data-testid="message-assistant"]', {
      timeout: 10000,
    });

    const messageElements = await this.page
      .getByTestId('message-assistant')
      .all();
    const lastMessageElement = messageElements[messageElements.length - 1];

    const content = await lastMessageElement
      .getByTestId('message-content')
      .innerText()
      .catch(() => null);

    const reasoningElement = await lastMessageElement
      .getByTestId('message-reasoning')
      .isVisible()
      .then(async (visible) =>
        visible
          ? await lastMessageElement
              .getByTestId('message-reasoning')
              .innerText()
          : null,
      )
      .catch(() => null);

    return {
      element: lastMessageElement,
      content,
      reasoning: reasoningElement,
      async toggleReasoningVisibility() {
        await lastMessageElement
          .getByTestId('message-reasoning-toggle')
          .click();
      },
      async upvote() {
        await lastMessageElement.getByTestId('message-upvote').click();
      },
      async downvote() {
        await lastMessageElement.getByTestId('message-downvote').click();
      },
    };
  }

  async getRecentUserMessage() {
    const messageElements = await this.page.getByTestId('message-user').all();
    const lastMessageElement = messageElements.at(-1);

    if (!lastMessageElement) {
      throw new Error('No user message found');
    }

    const content = await lastMessageElement
      .getByTestId('message-content')
      .innerText()
      .catch(() => null);

    const hasAttachments = await lastMessageElement
      .getByTestId('message-attachments')
      .isVisible()
      .catch(() => false);

    const attachments = hasAttachments
      ? await lastMessageElement.getByTestId('message-attachments').all()
      : [];

    const page = this.page;

    return {
      element: lastMessageElement,
      content,
      attachments,
      async edit(newMessage: string) {
        await page.getByTestId('message-edit-button').click();
        await page.getByTestId('message-editor').fill(newMessage);
        await page.getByTestId('message-editor-send-button').click();
        await expect(
          page.getByTestId('message-editor-send-button'),
        ).not.toBeVisible();
      },
    };
  }

  async expectToastToContain(text: string) {
    await expect(
      this.page.locator(`[data-sonner-toast] [data-title]:has-text("${text}")`),
    ).toBeVisible({
      timeout: 15000,
    });
  }

  async openSideBar() {
    const sidebarToggleButton = this.page.getByTestId('sidebar-toggle-button');
    await sidebarToggleButton.click();
  }

  public async isScrolledToBottom(): Promise<boolean> {
    return this.scrollContainer.evaluate(
      (el) => Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 1,
    );
  }

  public async waitForScrollToBottom(timeout = 5_000): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (await this.isScrolledToBottom()) return;
      await this.page.waitForTimeout(100);
    }

    throw new Error(`Timed out waiting for scroll bottom after ${timeout}ms`);
  }

  public async sendMultipleMessages(
    count: number,
    makeMessage: (i: number) => string,
  ) {
    for (let i = 0; i < count; i++) {
      await this.sendUserMessage(makeMessage(i));
      await this.isGenerationComplete();
    }
  }

  public async scrollToTop(): Promise<void> {
    await this.scrollContainer.evaluate((element) => {
      element.scrollTop = 0;
    });
  }

  // Drag and Drop helper methods for Suggested Actions
  public get suggestedActionsContainer() {
    return this.page.getByTestId('suggested-actions');
  }

  public get promptCards() {
    return this.suggestedActionsContainer.locator('[draggable="true"]');
  }

  async waitForPromptsToLoad(timeout = 10000): Promise<void> {
    // Wait for the loading skeleton to disappear and actual prompt cards to load
    await this.page.waitForFunction(
      () => {
        const container = document.querySelector(
          '[data-testid="suggested-actions"]',
        );
        if (!container) return false;

        // Check if we still have loading skeletons
        const skeletons = container.querySelectorAll('.animate-pulse.bg-muted');
        if (skeletons.length > 0) return false;

        // Check if we have draggable elements or empty state message
        const draggableElements =
          container.querySelectorAll('[draggable="true"]');
        const emptyStateMessage = container.querySelector(
          '.text-center.text-muted-foreground',
        );

        // Either we have draggable cards or we have an empty state message
        return draggableElements.length > 0 || emptyStateMessage !== null;
      },
      { timeout },
    );
  }

  async getPromptCardTitles(): Promise<string[]> {
    return await this.promptCards.locator('span.font-medium').allTextContents();
  }

  async dragPromptCard(fromIndex: number, toIndex: number): Promise<void> {
    const cards = this.promptCards;
    const fromCard = cards.nth(fromIndex);
    const toCard = cards.nth(toIndex);

    await fromCard.dragTo(toCard);
  }

  async waitForPromptReorderComplete(timeout = 5000): Promise<void> {
    // Wait for the "Saving new order..." indicator to appear and disappear
    const progressIndicator = this.page.locator('text=Saving new order...');

    try {
      await progressIndicator.waitFor({ state: 'visible', timeout: 1000 });
      await progressIndicator.waitFor({ state: 'hidden', timeout });
    } catch {
      // If indicator doesn't appear, just wait a bit for the operation to complete
      await this.page.waitForTimeout(500);
    }
  }

  async isDragInProgress(): Promise<boolean> {
    const dragIndicator = this.page.locator('text=Drag to reorder cards');
    return await dragIndicator.isVisible();
  }

  async isReorderInProgress(): Promise<boolean> {
    const reorderIndicator = this.page.locator('text=Saving new order...');
    return await reorderIndicator.isVisible();
  }

  async performControlledDrag(
    fromIndex: number,
    toIndex: number,
  ): Promise<void> {
    const cards = this.promptCards;
    const fromCard = cards.nth(fromIndex);
    const toCard = cards.nth(toIndex);

    // Get bounding boxes for precise control
    const fromBox = await fromCard.boundingBox();
    const toBox = await toCard.boundingBox();

    if (!fromBox || !toBox) {
      throw new Error('Could not get card positions for drag operation');
    }

    // Start drag
    await this.page.mouse.move(
      fromBox.x + fromBox.width / 2,
      fromBox.y + fromBox.height / 2,
    );
    await this.page.mouse.down();

    // Move to target with intermediate steps for better visual feedback
    const steps = 5;
    const deltaX = toBox.x + toBox.width / 2 - (fromBox.x + fromBox.width / 2);
    const deltaY =
      toBox.y + toBox.height / 2 - (fromBox.y + fromBox.height / 2);

    for (let i = 1; i <= steps; i++) {
      await this.page.mouse.move(
        fromBox.x + fromBox.width / 2 + (deltaX * i) / steps,
        fromBox.y + fromBox.height / 2 + (deltaY * i) / steps,
      );
      await this.page.waitForTimeout(50);
    }

    // Complete the drag
    await this.page.mouse.up();

    // Wait for reorder to complete
    await this.waitForPromptReorderComplete();
  }

  async simulateDragCancellation(cardIndex: number): Promise<void> {
    const card = this.promptCards.nth(cardIndex);
    const cardBox = await card.boundingBox();

    if (!cardBox) {
      throw new Error('Could not get card position');
    }

    // Start drag
    await this.page.mouse.move(
      cardBox.x + cardBox.width / 2,
      cardBox.y + cardBox.height / 2,
    );
    await this.page.mouse.down();

    // Move to show drag state
    await this.page.mouse.move(
      cardBox.x + cardBox.width / 2 + 50,
      cardBox.y + cardBox.height / 2 + 50,
    );
    await this.page.waitForTimeout(100);

    // Cancel with Escape
    await this.page.keyboard.press('Escape');
    await this.page.mouse.up();
  }

  async clickPromptCardWithoutDrag(cardIndex: number): Promise<void> {
    const card = this.promptCards.nth(cardIndex);

    // Quick click to avoid triggering drag
    await card.click({
      force: true,
      timeout: 1000,
    });
  }

  async verifyPromptOrderPersistence(): Promise<{
    before: string[];
    after: string[];
  }> {
    const beforeReload = await this.getPromptCardTitles();
    await this.page.reload();
    await this.isElementVisible('suggested-actions');
    await this.waitForPromptsToLoad();
    const afterReload = await this.getPromptCardTitles();

    return { before: beforeReload, after: afterReload };
  }

  // Chat management methods
  async openSidebar() {
    const sidebarToggleButton = this.page.getByTestId('sidebar-toggle-button');
    await sidebarToggleButton.click();
  }

  async getChatIdFromUrl(): Promise<string> {
    const url = this.page.url();
    const chatIdMatch = url.match(
      /\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/,
    );
    if (!chatIdMatch) {
      throw new Error('No chat ID found in URL');
    }
    return chatIdMatch[1];
  }

  async openChatMenu(chatId: string) {
    // Find the specific chat item in the sidebar and click its menu
    // First, locate the sidebar menu item that contains the link to our chat
    const chatMenuItem = this.page
      .locator('[data-sidebar="menu-item"]')
      .filter({
        has: this.page.locator(`a[href="/chat/${chatId}"]`),
      });

    // Find the menu action button within that specific menu item
    const menuButton = chatMenuItem.locator('[data-sidebar="menu-action"]');
    await menuButton.click();
  }

  async renameChatFromMenu() {
    // Click the rename option in the dropdown menu - more specific selector
    const renameMenuItem = this.page
      .locator('div[role="menuitem"]')
      .filter({ hasText: 'Rename' });
    await renameMenuItem.click();
  }

  async deleteChatFromMenu() {
    // Click the delete option in the dropdown menu - more specific selector
    const deleteMenuItem = this.page
      .locator('div[role="menuitem"]')
      .filter({ hasText: 'Delete' });
    await deleteMenuItem.click();
  }

  async fillRenameDialog(newTitle: string) {
    // Fill the rename dialog input - clear first then fill
    const titleInput = this.page.locator('input#title');
    await titleInput.clear();
    await titleInput.fill(newTitle);
  }

  async submitRenameDialog() {
    // Click the save button in the rename dialog - more specific selector
    const saveButton = this.page
      .locator('button[type="submit"]')
      .filter({ hasText: 'Save' });
    await saveButton.click();
  }

  async confirmDeleteDialog() {
    // Click the continue button in the confirmation dialog
    const continueButton = this.page.locator('button:has-text("Continue")');
    await continueButton.click();
  }

  async waitForChatDeletion() {
    // Wait for the chat to be deleted and redirected to home
    await this.page.waitForURL('/');
  }

  async waitForRenameComplete() {
    // Wait for the rename dialog to close by waiting for the dialog to be detached
    await this.page.waitForSelector('div[role="dialog"]', {
      state: 'detached',
    });
  }

  async getChatTitleFromSidebar(chatId: string): Promise<string> {
    const chatLink = this.page.locator(`a[href="/chat/${chatId}"]`);
    return (await chatLink.textContent()) || '';
  }

  // Method to get all chat IDs from the sidebar
  async getAllChatIdsFromSidebar(): Promise<string[]> {
    // Wait for sidebar to be fully loaded first
    await this.page.waitForSelector('[data-sidebar="menu-item"]', {
      timeout: 10000,
    });

    // Find all chat links in the sidebar
    const chatLinks = this.page.locator(
      '[data-sidebar="menu-item"] a[href*="/chat/"]',
    );
    const hrefs = await chatLinks.evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).href),
    );

    // Extract chat IDs from URLs
    const chatIds = hrefs
      .map((href) => {
        const match = href.match(
          /\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/,
        );
        return match ? match[1] : null;
      })
      .filter((id): id is string => id !== null);

    return chatIds;
  }

  // Method to delete all existing chats
  async deleteAllExistingChats(): Promise<void> {

    test.setTimeout(360000);

    // First ensure the sidebar is open
    await this.openSidebar();

    let totalDeleted = 0;
    let batchCount = 0;

    while (true) {
      // Get chat IDs currently visible in the sidebar
      const chatIds = await this.getAllChatIdsFromSidebar();

      if (chatIds.length === 0) {
        console.log(
          `🔄 No more chats to delete. Total deleted: ${totalDeleted}`,
        );
        break;
      }

      console.log(
        `🔄 Found ${chatIds.length} chats in current batch ${batchCount + 1}`,
      );

      // Delete up to 10 chats from current batch
      const chatsToDelete = chatIds.slice(0, 10);

      for (const chatId of chatsToDelete) {
        try {
          console.log(
            `🔄 Deleting chat: ${chatId} (${totalDeleted + 1} total)`,
          );

          // Open the chat menu
          await this.openChatMenu(chatId);

          // Click delete option
          await this.deleteChatFromMenu();

          // Confirm deletion
          await this.confirmDeleteDialog();

          // Wait for the toast message to appear (but don't fail if it doesn't)
          try {
            await this.expectToastToContain('Chat deleted successfully');
          } catch (error) {
            // Toast might not appear for every deletion, continue anyway
            console.log('⚠️ Toast message did not appear for chat deletion');
          }

          // Wait a bit before deleting the next chat
          await this.page.waitForTimeout(500);

          totalDeleted++;
          console.log(
            `✅ Successfully deleted chat: ${chatId} (${totalDeleted} total)`,
          );
        } catch (error) {
          console.log(`❌ Failed to delete chat ${chatId}:`, error);
          // Continue with the next chat even if this one fails
        }
      }

      batchCount++;

      // After deleting a batch, check if there are more chats by scrolling the sidebar
      // This helps trigger lazy loading of additional chats
      console.log(
        `🔄 Checking for more chats after batch ${batchCount} (deleted ${totalDeleted} so far)...`,
      );

      // Scroll to the bottom of the sidebar to trigger lazy loading
      const sidebar = this.page.locator('[data-sidebar="sidebar"]');
      await sidebar.evaluate((element) => {
        element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
      });

      // Wait for potential lazy loading
      await this.page.waitForTimeout(1000);

      // Get updated chat count to see if more chats were loaded
      const updatedChatIds = await this.getAllChatIdsFromSidebar();

      // If no new chats appeared and we've deleted all visible ones, we're done
      if (updatedChatIds.length === 0) {
        console.log(
          `🔄 No more chats found after scrolling. Finished deleting ${totalDeleted} chats total.`,
        );
        break;
      }

      console.log(
        `🔄 Found ${updatedChatIds.length} chats after scrolling, continuing...`,
      );
    }

    console.log(
      `✅ Finished deleting all existing chats. Total deleted: ${totalDeleted}`,
    );
  }
}
