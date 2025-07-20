'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useCopyToClipboard } from 'usehooks-ts';
import { toast } from 'sonner';
import { CopyIcon, FullscreenIcon } from './icons';
import { Button } from './ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from './ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSvg, setModalSvg] = useState<string>('');
  const [_, copyToClipboard] = useCopyToClipboard();

  const renderMermaidChart = async (container: HTMLDivElement, chartData: string, isModal = false) => {
    console.log('Rendering mermaid chart', { isModal, container, chartData: `${chartData.substring(0, 50)}...` });
    
    try {
      // Initialize mermaid with configuration
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
        fontSize: isModal ? 16 : 14,
        sequence: {
          actorMargin: 50,
          width: 150,
          height: 65,
          boxMargin: 10,
          boxTextMargin: 5,
          noteMargin: 10,
          messageMargin: 35,
          mirrorActors: true,
          bottomMarginAdj: 1,
          useMaxWidth: true,
          rightAngles: false,
          showSequenceNumbers: false
        },
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        },
        gantt: {
          useMaxWidth: true
        },
        gitGraph: {
          useMaxWidth: true
        }
      });

      // Generate a unique ID for this diagram
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('About to render mermaid with ID:', id);
      
      // Render the mermaid diagram
      const { svg } = await mermaid.render(id, chartData);
      console.log('Mermaid render success', { isModal, svg: `${svg.substring(0, 100)}...` });
      
      if (isModal) {
        // For modal, store the SVG in state instead of directly setting innerHTML
        let processedSvg = svg;
        
        // Apply dark mode styles if needed
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
          // Create a temporary div to process the SVG
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = svg;
          const svgElement = tempDiv.querySelector('svg');
          if (svgElement) {
            svgElement.style.filter = 'invert(0.9) hue-rotate(180deg)';
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
            processedSvg = tempDiv.innerHTML;
          }
        }
        
        setModalSvg(processedSvg);
      } else {
        // For normal rendering, set innerHTML directly
        container.innerHTML = svg;
        
        // Apply dark mode styles if needed
        const isDark = document.documentElement.classList.contains('dark');
        const svgElement = container.querySelector('svg');
        if (svgElement && isDark) {
          svgElement.style.filter = 'invert(0.9) hue-rotate(180deg)';
        }
      }
    } catch (error) {
      console.error('Mermaid rendering error:', error);
      const errorMessage = `<pre class="text-red-500 bg-red-50 dark:bg-red-900/20 p-4 rounded border">Failed to render diagram: ${error instanceof Error ? error.message : 'Unknown error'}</pre>`;
      
      if (isModal) {
        setModalSvg(errorMessage);
      } else {
        container.innerHTML = errorMessage;
      }
    }
  };

  useEffect(() => {
    if (ref.current) {
      renderMermaidChart(ref.current, chart);
    }
  }, [chart]);

  // Re-render modal content when theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      if (isModalOpen) {
        // Re-process the SVG for current theme
        renderMermaidChart(document.createElement('div'), chart, true);
      }
    };

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          handleThemeChange();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [isModalOpen, chart]);

  const handleCopy = async () => {
    try {
      await copyToClipboard(chart);
      toast.success('Mermaid code copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleEnlarge = async () => {
    console.log('Opening modal and rendering chart...');
    setIsModalOpen(true);
    // Pre-render the SVG for the modal
    await renderMermaidChart(document.createElement('div'), chart, true);
  };

  return (
    <>
      <div className="mermaid-container my-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-x-auto relative group">
        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="size-8 bg-white/90 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-700 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-600/50 shadow-sm"
                >
                  <CopyIcon size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy mermaid code</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEnlarge}
                  className="size-8 bg-white/90 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-700 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-600/50 shadow-sm"
                >
                  <FullscreenIcon size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View fullscreen</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Diagram container - clickable */}
        <div 
          ref={ref} 
          className="cursor-pointer"
          style={{ textAlign: 'center' }}
          onClick={handleEnlarge}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleEnlarge();
            }
          }}
        />
      </div>

      {/* Fullscreen modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl w-full h-[90vh] max-h-[90vh] p-6 flex flex-col">
          <DialogHeader>
            <DialogTitle>Mermaid Diagram</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
            <div 
              className="size-full min-h-[400px] flex items-center justify-center bg-white dark:bg-zinc-800"
              style={{ textAlign: 'center' }}
              dangerouslySetInnerHTML={{ __html: modalSvg }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
