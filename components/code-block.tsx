
'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useCopyToClipboard } from 'usehooks-ts';
import { toast } from 'sonner';
import { type Highlighter } from 'shiki';
import { getShikiHighlighter } from '@/lib/shiki-highlighter';
import { Mermaid } from './mermaid';
import { CopyIcon, PlayIcon } from './icons';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

// Python output handlers for different libraries
const OUTPUT_HANDLERS = {
  matplotlib: `
    import io
    import base64
    from matplotlib import pyplot as plt

    # Clear any existing plots
    plt.clf()
    plt.close('all')

    # Switch to agg backend
    plt.switch_backend('agg')

    def setup_matplotlib_output():
        def custom_show():
            if plt.gcf().get_size_inches().prod() * plt.gcf().dpi ** 2 > 25_000_000:
                print("Warning: Plot size too large, reducing quality")
                plt.gcf().set_dpi(100)

            png_buf = io.BytesIO()
            plt.savefig(png_buf, format='png')
            png_buf.seek(0)
            png_base64 = base64.b64encode(png_buf.read()).decode('utf-8')
            print(f'data:image/png;base64,{png_base64}')
            png_buf.close()

            plt.clf()
            plt.close('all')

        plt.show = custom_show
  `,
  basic: `
    # Basic output capture setup
  `,
};

function detectRequiredHandlers(code: string): string[] {
  const handlers: string[] = ['basic'];

  if (code.includes('matplotlib') || code.includes('plt.')) {
    handlers.push('matplotlib');
  }

  return handlers;
}

interface ExecutionResult {
  output: string[];
  images: string[];
  error?: string;
  status: 'running' | 'completed' | 'error' | 'loading';
}

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
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [pyodideReady, setPyodideReady] = useState(false);

  // Extract the language and code early for use in hooks
  const language = className?.replace('language-', '') || '';
  const code = Array.isArray(children) ? children[0] : children;
  const isInlineCode = inline !== false && (!className || !className.startsWith('language-'));

  // Initialize Shiki highlighter using singleton
  useEffect(() => {
    let isMounted = true;
    
    getShikiHighlighter().then((highlighter) => {
      if (isMounted) {
        setHighlighter(highlighter);
      }
    }).catch((error) => {
      console.error('Failed to initialize Shiki highlighter:', error);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize Pyodide for Python execution
  useEffect(() => {
    const initPyodide = async () => {
      try {
        // @ts-expect-error - loadPyodide is loaded from CDN
        if (typeof globalThis.loadPyodide === 'undefined') {
          // Load Pyodide script if not already loaded
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js';
          script.onload = () => {
            setPyodideReady(true);
          };
          document.head.appendChild(script);
        } else {
          setPyodideReady(true);
        }
      } catch (error) {
        console.error('Failed to load Pyodide:', error);
      }
    };

    initPyodide();
  }, []);

  // Highlight code with Shiki
  useEffect(() => {
    if (!isInlineCode && highlighter && typeof code === 'string') {
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
  }, [isInlineCode, highlighter, code, language, theme]);

  // In react-markdown v9, inline code is detected by the absence of a className starting with 'language-'
  // and by checking if it's not inside a pre tag

  if (!isInlineCode) {
    // Check if this is a mermaid diagram
    if (language === 'mermaid' && typeof code === 'string') {
      return <Mermaid chart={code.trim()} />;
    }

    const handleCopy = async () => {
      try {
        await copyToClipboard(code);
        toast.success('Code copied to clipboard!');
      } catch (error) {
        toast.error('Failed to copy to clipboard');
      }
    };

    const handleRunPython = async () => {
      if (!pyodideReady || typeof code !== 'string') {
        toast.error('Python execution is not ready');
        return;
      }

      setExecutionResult({ output: [], images: [], status: 'loading' });

      try {
        // @ts-expect-error - loadPyodide is loaded from CDN
        const pyodide = await globalThis.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
        });

        const outputLines: string[] = [];
        const images: string[] = [];

        // Set up output capture
        pyodide.setStdout({
          batched: (output: string) => {
            if (output.startsWith('data:image/png;base64')) {
              images.push(output);
            } else {
              outputLines.push(output);
            }
          },
        });

        setExecutionResult({ output: outputLines, images, status: 'running' });

        // Load required packages
        await pyodide.loadPackagesFromImports(code);

        // Set up output handlers for libraries like matplotlib
        const requiredHandlers = detectRequiredHandlers(code);
        for (const handler of requiredHandlers) {
          if (OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS]) {
            await pyodide.runPythonAsync(
              OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS],
            );

            if (handler === 'matplotlib') {
              await pyodide.runPythonAsync('setup_matplotlib_output()');
            }
          }
        }

        // Execute the code
        const result = await pyodide.runPythonAsync(code);
        
        // If there's a result and no output was captured, show the result
        if (result !== undefined && outputLines.length === 0) {
          outputLines.push(String(result));
        }

        setExecutionResult({ 
          output: outputLines, 
          images, 
          status: 'completed' 
        });

        toast.success('Code executed successfully!');
      } catch (error: any) {
        setExecutionResult({
          output: [],
          images: [],
          error: error.message,
          status: 'error',
        });
        toast.error('Failed to execute Python code');
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
      <div className="not-prose flex flex-col my-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden w-full max-w-[calc(100vw-3rem)] sm:max-w-[685px]">
        {/* Header with language label and action buttons */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 ml-2">
              {displayLanguage}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Python Run Button */}
            {language === 'python' && pyodideReady && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRunPython}
                      disabled={executionResult?.status === 'running' || executionResult?.status === 'loading'}
                      className="h-7 w-7 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <PlayIcon size={12} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Run Python code</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Copy Button */}
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
        </div>

        {/* Code content */}
        {highlightedCode ? (
          <div
            className="overflow-x-hidden [&>pre]:!bg-transparent [&>pre]:!p-3 [&>pre]:sm:[&>pre]:!p-4 [&>pre]:text-xs [&>pre]:sm:[&>pre]:text-sm [&>pre]:!m-0 [&>pre]:whitespace-pre-wrap [&>pre]:break-words [&>pre]:overflow-hidden"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        ) : (
          <pre
            {...props}
            className="text-xs sm:text-sm w-full overflow-hidden p-3 sm:p-4 bg-transparent dark:text-zinc-50 text-zinc-900 whitespace-pre-wrap break-words"
          >
            <code className="whitespace-pre-wrap break-words overflow-hidden">{children}</code>
          </pre>
        )}

        {/* Execution Results */}
        {executionResult && (
          <div className="border-t border-zinc-200 dark:border-zinc-700">
            <div className="px-3 sm:px-4 py-2 bg-zinc-50 dark:bg-zinc-800">
              <div className="flex items-center gap-2">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {executionResult.status === 'loading' && 'Loading packages...'}
                  {executionResult.status === 'running' && 'Executing...'}
                  {executionResult.status === 'completed' && 'Output'}
                  {executionResult.status === 'error' && 'Error'}
                </div>
                {(executionResult.status === 'loading' || executionResult.status === 'running') && (
                  <div className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
            </div>
            
            <div className="p-3 sm:p-4 bg-white dark:bg-white text-zinc-900 font-mono text-xs sm:text-sm min-h-60 sm:min-h-96 max-h-[400px] sm:max-h-[600px] overflow-y-auto overflow-x-hidden border border-zinc-200">
              {executionResult.status === 'error' && executionResult.error && (
                <div className="text-red-600 whitespace-pre-wrap break-words">
                  <span className="text-red-500 font-semibold">Error:</span> {executionResult.error}
                </div>
              )}
              
              {executionResult.output.map((line, index) => (
                <div key={index} className="whitespace-pre-wrap break-words overflow-hidden">
                  {line}
                </div>
              ))}
              
              {executionResult.images.map((image, index) => (
                <div key={index} className="my-2 overflow-hidden">
                  <img 
                    src={image} 
                    alt={`Output ${index + 1}`} 
                    className="max-w-full h-auto rounded border border-zinc-300"
                  />
                </div>
              ))}
              
              {executionResult.status === 'completed' && 
               executionResult.output.length === 0 && 
               executionResult.images.length === 0 && (
                <div className="text-zinc-400 italic">No output</div>
              )}
            </div>
          </div>
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
