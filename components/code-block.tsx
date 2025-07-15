
'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useCopyToClipboard } from 'usehooks-ts';
import { toast } from 'sonner';
import { createHighlighter, type Highlighter } from 'shiki';
import { Mermaid } from './mermaid';
import { CopyIcon } from './icons';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface CodeBlockProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: any;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const { theme } = useTheme();
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [_, copyToClipboard] = useCopyToClipboard();

  // Initialize Shiki highlighter
  useEffect(() => {
    createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: [
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
      ],
    }).then(setHighlighter);
  }, []);

  // In react-markdown v9, inline code is detected by the absence of a className starting with 'language-'
  // and by checking if it's not inside a pre tag
  const isInlineCode = inline !== false && (!className || !className.startsWith('language-'));

  if (!isInlineCode) {
    // Extract the language from className (e.g., "language-mermaid" -> "mermaid")
    const language = className?.replace('language-', '') || '';
    const code = Array.isArray(children) ? children[0] : children;
    
    // Check if this is a mermaid diagram
    if (language === 'mermaid' && typeof code === 'string') {
      return <Mermaid chart={code.trim()} />;
    }

    // Highlight code with Shiki
    useEffect(() => {
      if (highlighter && typeof code === 'string') {
        const currentTheme = theme === 'dark' ? 'github-dark' : 'github-light';
        try {
          const highlighted = highlighter.codeToHtml(code, {
            lang: language || 'text',
            theme: currentTheme,
          });
          setHighlightedCode(highlighted);
        } catch (error) {
          // Fallback for unsupported languages
          const highlighted = highlighter.codeToHtml(code, {
            lang: 'text',
            theme: currentTheme,
          });
          setHighlightedCode(highlighted);
        }
      }
    }, [highlighter, code, language, theme]);

    const handleCopy = async () => {
      try {
        await copyToClipboard(code);
        toast.success('Code copied to clipboard!');
      } catch (error) {
        toast.error('Failed to copy to clipboard');
      }
    };

    // Format language name for display
    const getLanguageDisplayName = (lang: string) => {
      const languageMap: Record<string, string> = {
        'javascript': 'JavaScript',
        'typescript': 'TypeScript',
        'jsx': 'JSX',
        'tsx': 'TSX',
        'python': 'Python',
        'html': 'HTML',
        'css': 'CSS',
        'json': 'JSON',
        'bash': 'Bash',
        'shell': 'Shell',
        'yaml': 'YAML',
        'yml': 'YAML',
        'markdown': 'Markdown',
        'md': 'Markdown',
        'sql': 'SQL',
        'java': 'Java',
        'c': 'C',
        'cpp': 'C++',
        'php': 'PHP',
        'ruby': 'Ruby',
        'go': 'Go',
        'rust': 'Rust',
        'swift': 'Swift',
        'kotlin': 'Kotlin',
        'text': 'Text',
        '': 'Code'
      };
      return languageMap[lang.toLowerCase()] || lang.charAt(0).toUpperCase() + lang.slice(1);
    };

    const displayLanguage = getLanguageDisplayName(language);

    return (
      <div className="not-prose flex flex-col my-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
        {/* Header with language label and copy button */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 ml-2">
              {displayLanguage}
            </span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="h-7 w-7 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <CopyIcon size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy code</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Code content */}
        {highlightedCode ? (
          <div
            className="overflow-x-auto [&>pre]:!bg-transparent [&>pre]:!p-4 [&>pre]:text-sm [&>pre]:!m-0"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        ) : (
          <pre
            {...props}
            className="text-sm w-full overflow-x-auto p-4 bg-transparent dark:text-zinc-50 text-zinc-900"
          >
            <code className="whitespace-pre-wrap break-words">{children}</code>
          </pre>
        )}
      </div>
    );
  } else {
    return (
      <code
        className={`${className} inline-flex items-center text-xs font-mono font-medium px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors`}
        {...props}
      >
        {children}
      </code>
    );
  }
}
