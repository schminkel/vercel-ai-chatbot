'use client';

import { Mermaid } from './mermaid';

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className: string;
  children: any;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  if (!inline) {
    // Extract the language from className (e.g., "language-mermaid" -> "mermaid")
    const language = className?.replace('language-', '') || '';
    const code = Array.isArray(children) ? children[0] : children;
    
    // Check if this is a mermaid diagram
    if (language === 'mermaid' && typeof code === 'string') {
      return <Mermaid chart={code.trim()} />;
    }

    return (
      <div className="not-prose flex flex-col">
        <pre
          {...props}
          className={`text-sm w-full overflow-x-auto dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-zinc-50 text-zinc-900`}
        >
          <code className="whitespace-pre-wrap break-words">{children}</code>
        </pre>
      </div>
    );
  } else {
    return (
      <code
        className={`${className} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
        {...props}
      >
        {children}
      </code>
    );
  }
}
