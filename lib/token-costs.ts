// Token cost calculator for different AI models
// Prices are in EUR per 1M tokens

interface ModelCosts {
  inputTokensPerMillion?: number;  // Cost per 1M input tokens in EUR
  outputTokensPerMillion?: number; // Cost per 1M output tokens in EUR
  reasoningTokensPerMillion?: number; // Cost per 1M reasoning tokens in EUR (for o1 models)
  perImage?: number; // Cost per image processed (for image models)
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
};

interface UsageData {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
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
    minimumFractionDigits: Math.min(decimalPlaces, 10), // Cap at 10 for readability
    maximumFractionDigits: Math.min(decimalPlaces, 10), // Cap at 10 for readability
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
