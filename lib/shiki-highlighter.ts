import { createHighlighter, type Highlighter } from 'shiki';

let highlighterInstance: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;

const themes = ['github-light', 'github-dark'];
const langs = [
  'javascript',
  'typescript',
  'python',
  'html',
  'css',
  'json',
  'bash',
  'shell',
  'yaml',
  'markdown',
  'sql',
  'jsx',
  'tsx',
  'java',
  'c',
  'cpp',
  'php',
  'ruby',
  'go',
  'rust',
  'swift',
  'kotlin',
];

/**
 * Get or create a singleton Shiki highlighter instance
 * This ensures only one highlighter is created and reused across the app
 */
export async function getShikiHighlighter(): Promise<Highlighter> {
  // Return existing instance if available
  if (highlighterInstance) {
    return highlighterInstance;
  }

  // Return existing promise if one is in progress
  if (highlighterPromise) {
    return highlighterPromise;
  }

  // Create new highlighter
  highlighterPromise = createHighlighter({
    themes,
    langs,
  }).then((highlighter) => {
    highlighterInstance = highlighter;
    highlighterPromise = null; // Clear the promise once resolved
    return highlighter;
  });

  return highlighterPromise;
}

/**
 * Dispose of the highlighter instance (useful for cleanup)
 */
export function disposeShikiHighlighter(): void {
  if (highlighterInstance) {
    highlighterInstance.dispose();
    highlighterInstance = null;
  }
  highlighterPromise = null;
}

/**
 * Check if highlighter is ready (synchronously available)
 */
export function isShikiHighlighterReady(): boolean {
  return highlighterInstance !== null;
}

/**
 * Get the highlighter instance if it's ready, otherwise return null
 */
export function getShikiHighlighterSync(): Highlighter | null {
  return highlighterInstance;
}
