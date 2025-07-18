// Token cost calculator for different AI models
// Prices are in EUR per 1M tokens
// USD prices converted to EUR using approximate rate of 1 USD = 0.9 EUR

interface ModelCosts {
  inputTokensPerMillion?: number;  // Cost per 1M input tokens in EUR
  outputTokensPerMillion?: number; // Cost per 1M output tokens in EUR
  reasoningTokensPerMillion?: number; // Cost per 1M reasoning tokens in EUR (for o1 models)
  perImage?: number; // Cost per image processed (for image models)
  promptCacheWritePerMillion?: number; // Cost per 1M tokens for prompt cache writes (Anthropic)
  promptCacheReadPerMillion?: number;  // Cost per 1M tokens for prompt cache reads (Anthropic)
}

// Model pricing mapping - update these with current pricing
const MODEL_COSTS: Record<string, ModelCosts> = {
  // OpenAI GPT-4 models
  'openai-gpt-4.1': {
    inputTokensPerMillion: 30.0,
    outputTokensPerMillion: 60.0,
  },
  'openai-gpt-4.1-mini': {
    inputTokensPerMillion: 0.15,
    outputTokensPerMillion: 0.60,
  },
  'openai-gpt-4.1-nano': {
    inputTokensPerMillion: 0.05,
    outputTokensPerMillion: 0.20,
  },
  
  // xAI Grok model
  'xai-grok-4': {
    inputTokensPerMillion: 3.0,
    outputTokensPerMillion: 15.0,
  },
  'xai-grok-3': {
    inputTokensPerMillion: 3.0,
    outputTokensPerMillion: 15.0,
  },
  'xai-grok-3-mini': {
    inputTokensPerMillion: 0.30,
    outputTokensPerMillion: 0.50,
  },
  'xai-image': {
    perImage: 0.07,
  },
  'openai-gpt-image-1': {
    perImage: 0.04, // GPT Image 1 standard pricing in EUR
  },
  
  // Anthropic Claude models (converted from USD to EUR, approximate rates)
  'anthropic-claude-opus-4': {
    inputTokensPerMillion: 13.50,   // $15 * 0.9 EUR/USD
    outputTokensPerMillion: 67.50,  // $75 * 0.9 EUR/USD
    promptCacheWritePerMillion: 16.88, // $18.75 * 0.9 EUR/USD
    promptCacheReadPerMillion: 1.35,   // $1.50 * 0.9 EUR/USD
  },
  'anthropic-claude-sonnet-4': {
    inputTokensPerMillion: 2.70,    // $3 * 0.9 EUR/USD
    outputTokensPerMillion: 13.50,  // $15 * 0.9 EUR/USD
    promptCacheWritePerMillion: 3.38,  // $3.75 * 0.9 EUR/USD
    promptCacheReadPerMillion: 0.27,   // $0.30 * 0.9 EUR/USD
  },
  'anthropic-claude-haiku-3.5': {
    inputTokensPerMillion: 0.72,    // $0.80 * 0.9 EUR/USD
    outputTokensPerMillion: 3.60,   // $4 * 0.9 EUR/USD
    promptCacheWritePerMillion: 0.90,  // $1 * 0.9 EUR/USD
    promptCacheReadPerMillion: 0.07,   // $0.08 * 0.9 EUR/USD
  },
};

interface UsageData {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  imagesGenerated?: number; // Number of images generated (for image models)
  promptCacheWriteTokens?: number; // Tokens written to prompt cache (Anthropic)
  promptCacheReadTokens?: number;  // Tokens read from prompt cache (Anthropic)
}

/**
 * Calculate the cost in EUR for token usage based on the model
 * @param modelId - The model identifier
 * @param usage - Token usage data
 * @returns Cost in EUR, or null if model pricing is not available
 */
export function calculateTokenCost(modelId: string, usage: UsageData): number | null {
  const modelCosts = MODEL_COSTS[modelId];
  
  if (!modelCosts) {
    console.warn(`No pricing data available for model: ${modelId}`);
    return null;
  }
  
  let totalCost = 0;
  
  // Calculate image generation cost if applicable
  if (usage.imagesGenerated && modelCosts.perImage) {
    totalCost += usage.imagesGenerated * modelCosts.perImage;
  }
  
  // Calculate input token cost (subtract cached tokens as they're typically free or heavily discounted)
  const billableInputTokens = usage.inputTokens - (usage.cachedInputTokens || 0);
  totalCost += (billableInputTokens / 1_000_000) * (modelCosts.inputTokensPerMillion || 0);
  
  // Calculate output token cost
  totalCost += (usage.outputTokens / 1_000_000) * (modelCosts.outputTokensPerMillion || 0);
  
  // Calculate reasoning token cost (for o1 models or fallback to output cost)
  if (usage.reasoningTokens) {
    const reasoningCostPerMillion = modelCosts.reasoningTokensPerMillion ?? modelCosts.outputTokensPerMillion;
    totalCost += (usage.reasoningTokens / 1_000_000) * (reasoningCostPerMillion || 0);
  }
  
  // Calculate prompt cache costs (Anthropic models)
  if (usage.promptCacheWriteTokens && modelCosts.promptCacheWritePerMillion) {
    totalCost += (usage.promptCacheWriteTokens / 1_000_000) * modelCosts.promptCacheWritePerMillion;
  }
  
  if (usage.promptCacheReadTokens && modelCosts.promptCacheReadPerMillion) {
    totalCost += (usage.promptCacheReadTokens / 1_000_000) * modelCosts.promptCacheReadPerMillion;
  }
  
  return totalCost;
}

/**
 * Format cost as a readable string in EUR using German formatting
 * @param cost - Cost in EUR
 * @returns Formatted cost string with German formatting (€ symbol first, comma as decimal separator)
 */
export function formatCost(cost: number): string {
  // Convert to string to preserve full precision
  const costStr = cost.toString();
  
  // Find the number of decimal places needed (no rounding)
  const decimalIndex = costStr.indexOf('.');
  const decimalPlaces = decimalIndex === -1 ? 0 : costStr.length - decimalIndex - 1;
  
  // Use German locale formatting with exact precision
  const formatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Math.min(decimalPlaces, 8), // Cap at 8 for readability
    maximumFractionDigits: Math.min(decimalPlaces, 8), // Cap at 8 for readability
  });
  
  return formatter.format(cost);
}

/**
 * Get available model IDs for which pricing is configured
 * @returns Array of model IDs
 */
export function getAvailableModels(): string[] {
  return Object.keys(MODEL_COSTS);
}
