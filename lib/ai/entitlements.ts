import type { UserType } from '@/app/(auth)/auth';
import type { ChatModel } from './models';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel['id']>;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */

  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: [
      'xai-grok-4',
      'xai-grok-3',
      'xai-grok-3-mini',
      'xai-image',
      'openai-gpt-4.1',
      'openai-gpt-4.1-mini',
    ],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: [
      'xai-grok-4',
      'xai-grok-3',
      'xai-grok-3-mini',
      'xai-image',
      'openai-gpt-4.1',
      'openai-gpt-4.1-mini',
    ],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
