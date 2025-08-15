import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, RotateCcw } from 'lucide-react';
import mermaid from 'mermaid';

interface DocumentMdModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    titulo: string;
    md_file: string | null;
    md_file_old: string | null;
  };
}

// Mermaid diagram component (same as MarkdownPreview)
function MermaidDiagram({ chart }: { chart: string }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elementRef.current && chart.trim()) {
      // Initialize mermaid if not already done
      const isDarkMode = document.documentElement.classList.contains('dark');
      mermaid.initialize({
        startOnLoad: false,
        theme: isDarkMode ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        themeVariables: isDarkMode ? {
          primaryColor: '#1B2028',
          primaryTextColor: '#FFFFFF',
          primaryBorderColor: '#FFFFFF',
          lineColor: '#FFFFFF',
          secondaryColor: '#1E293B',
          tertiaryColor: '#374151',
          edgeLabelBackground: '#333B4D',
          labelBackground: '#333B4D',
          labelTextColor: '#FFFFFF',
          edgeLabelColor: '#FFFFFF',
        } : {}
      });

      // Generate unique ID for this diagram
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      
      // Clean the chart content
      const cleanChart = chart.trim();
      
      // Render the diagram
      mermaid.render(id, cleanChart).then((result) => {
        if (elementRef.current) {
          elementRef.current.innerHTML = result.svg;
        }
      }).catch((error) => {
        console.error('Mermaid rendering error:', error);
        if (elementRef.current) {
          elementRef.current.innerHTML = `<div class="p-4 bg-red-50 border border-red-200 rounded text-red-700">
            <strong>Erro ao renderizar diagrama Mermaid:</strong><br/>
            <pre class="mt-2 text-sm whitespace-pre-wrap">${cleanChart}</pre>
            <div class="mt-2 text-xs text-gray-600">Erro: ${error.message || error}</div>
          </div>`;
        }
      });
    }
  }, [chart]);

  return <div ref={elementRef} className="my-4 flex justify-center w-full" />;
}

// Process inline formatting (same as MarkdownPreview)
function processInlineFormatting(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyCounter = 0;

  while (remaining.length > 0) {
    // Bold (**text**)
    const boldMatch = remaining.match(/^([\s\S]*?)\*\*([\s\S]*?)\*\*([\s\S]*)/);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(<strong key={keyCounter++} className="font-bold">{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
      continue;
    }

    // Italic (*text*)
    const italicMatch = remaining.match(/^([\s\S]*?)\*([\s\S]*?)\*([\s\S]*)/);
    if (italicMatch && !italicMatch[0].includes('**')) {
      if (italicMatch[1]) parts.push(italicMatch[1]);
      parts.push(<em key={keyCounter++} className="italic">{italicMatch[2]}</em>);
      remaining = italicMatch[3];
      continue;
    }

    // Inline code (`code`)
    const codeMatch = remaining.match(/^([\s\S]*?)`([\s\S]*?)`([\s\S]*)/);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(codeMatch[1]);
      parts.push(<code key={keyCounter++} className="bg-gray-100 dark:bg-[#1E293B] text-black dark:text-white px-2 py-1 rounded text-sm font-mono">{codeMatch[2]}</code>);
      remaining = codeMatch[3];
      continue;
    }

    // Links [text](url)
    const linkMatch = remaining.match(/^([\s\S]*?)\[([^\]]+)\]\(([^)]+)\)([\s\S]*)/);
    
    if (linkMatch) {
      if (linkMatch[1]) parts.push(linkMatch[1]);
      parts.push(
        <a key={keyCounter++} href={linkMatch[3]} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
          {linkMatch[2]}
        </a>
      );
      remaining = linkMatch[4];
      continue;
    }

    // No more formatting found, add the rest
    parts.push(remaining);
    break;
  }

  return parts;
}

// Parse markdown to React components (same logic as MarkdownPreview)
function parseMarkdownToReact(markdown: string): React.ReactNode {
  if (!markdown) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg">Nenhum conteúdo para visualizar</p>
        <p className="text-sm mt-2">Documento não possui conteúdo markdown</p>
      </div>
    );
  }

  // Clean markdown content
  function cleanMarkdownContent(markdown: string): string {
    if (!markdown?.trim()) return markdown;
    
    return markdown
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
  }

  const cleanMarkdown = cleanMarkdownContent(markdown);
  const lines = cleanMarkdown.split('\n');
  const elements: React.ReactNode[] = [];
  let currentParagraph: string[] = [];
  let inCodeBlock = false;
  let codeBlock: string[] = [];
  let codeBlockLanguage = '';
  let inTable = false;
  let tableRows: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const content = currentParagraph.join('\n').trim();
      if (content) {
        const processedContent = processInlineFormatting(content);
        elements.push(<p key={elements.length} className="mb-4 leading-relaxed text-black dark:text-white">{processedContent}</p>);
      }
      currentParagraph = [];
    }
  };

  const flushCodeBlock = (language?: string) => {
    if (codeBlock.length > 0) {
      const content = codeBlock.join('\n');
      
      if (language === 'mermaid') {
        elements.push(<MermaidDiagram key={elements.length} chart={content} />);
      } else {
        elements.push(
          <pre key={elements.length} className="bg-gray-900 dark:bg-[#111827] text-gray-100 dark:text-gray-300 p-4 rounded-lg mb-4 overflow-x-auto">
            <code className="text-sm font-mono">{content}</code>
          </pre>
        );
      }
      codeBlock = [];
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const validRows = tableRows.filter((row: string) => 
        row.trim() !== '' && !row.match(/^\s*\|\s*[-:]+\s*\|\s*[-:]*\s*\|/)
      );

      if (validRows.length > 0) {
        const tableElements: React.ReactNode[] = [];
        let isFirstRow = true;

        validRows.forEach((row: string, index: number) => {
          const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
          
          if (cells.length > 0) {
            if (isFirstRow) {
              tableElements.push(
                <thead key="thead" className="bg-gray-50 dark:bg-[#111827]">
                  <tr className="hover:bg-gray-50 dark:hover:bg-[#1E293B]">
                    {cells.map((cell, cellIndex) => (
                      <th key={cellIndex} className="px-4 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider border-b border-gray-300 dark:border-[#374151] bg-gray-50 dark:bg-[#1B2028]">
                        {processInlineFormatting(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
              );
              tableElements.push(<tbody key="tbody" className="divide-y divide-gray-200 dark:divide-[#374151]" />);
              isFirstRow = false;
            } else {
              const tbody = tableElements[tableElements.length - 1] as React.ReactElement;
              const newRow = (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-[#1E293B]">
                  {cells.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3 text-sm text-black dark:text-white border-b border-gray-300 dark:border-[#374151]">
                      {processInlineFormatting(cell)}
                    </td>
                  ))}
                </tr>
              );
              
              const updatedTbody = React.cloneElement(tbody, { 
                children: [...(Array.isArray(tbody.props.children) ? tbody.props.children : [tbody.props.children]).filter(Boolean), newRow]
              });
              tableElements[tableElements.length - 1] = updatedTbody;
            }
          }
        });

        elements.push(
          <div key={elements.length} className="overflow-x-auto mb-4">
            <table className="border-collapse border border-gray-300 dark:border-[#374151] rounded-lg">
              {tableElements}
            </table>
          </div>
        );
      }
      
      tableRows = [];
    }
  };

  lines.forEach((line, index) => {
    // Code block detection
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock(codeBlockLanguage);
        inCodeBlock = false;
        codeBlockLanguage = '';
        return;
      } else {
        flushParagraph();
        flushTable();
        inCodeBlock = true;
        codeBlockLanguage = line.substring(3).trim();
        return;
      }
    }

    if (inCodeBlock) {
      codeBlock.push(line);
      return;
    }

    // Table detection
    if (line.includes('|') && line.trim() !== '') {
      if (!inTable) {
        flushParagraph();
        inTable = true;
      }
      tableRows.push(line);
      return;
    } else if (inTable) {
      flushTable();
      inTable = false;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      flushParagraph();
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      const processedContent = processInlineFormatting(content);
      
      const headerClasses = {
        1: "text-3xl font-bold mb-6 text-black dark:text-white border-b border-gray-200 dark:border-[#374151] pb-3",
        2: "text-2xl font-semibold mb-4 text-black dark:text-white mt-8",
        3: "text-xl font-medium mb-3 text-black dark:text-white mt-6",
        4: "text-lg font-medium mb-2 text-black dark:text-white mt-4",
        5: "text-base font-medium mb-2 text-black dark:text-white mt-3",
        6: "text-sm font-medium mb-2 text-black dark:text-white mt-2"
      };
      
      const HeaderTag = `h${level}` as keyof JSX.IntrinsicElements;
      elements.push(React.createElement(HeaderTag, { 
        key: elements.length, 
        className: headerClasses[level as keyof typeof headerClasses]
      }, processedContent));
      return;
    }

    // Lists
    if (line.match(/^\s*[-*+]\s+/)) {
      flushParagraph();
      const content = line.replace(/^\s*[-*+]\s+/, '');
      const processedContent = processInlineFormatting(content);
      elements.push(
        <ul key={elements.length} className="list-disc pl-6 mb-4 space-y-2">
          <li className="text-black dark:text-white">{processedContent}</li>
        </ul>
      );
      return;
    }

    if (line.match(/^\s*\d+\.\s+/)) {
      flushParagraph();
      const content = line.replace(/^\s*\d+\.\s+/, '');
      const processedContent = processInlineFormatting(content);
      elements.push(
        <ol key={elements.length} className="list-decimal pl-6 mb-4 space-y-2">
          <li className="text-black dark:text-white">{processedContent}</li>
        </ol>
      );
      return;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      flushParagraph();
      const content = line.substring(2);
      const processedContent = processInlineFormatting(content);
      elements.push(
        <blockquote key={elements.length} className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 mb-4 bg-gray-50 dark:bg-[#1E293B] italic text-black dark:text-white">
          {processedContent}
        </blockquote>
      );
      return;
    }

    // Empty lines
    if (line.trim() === '') {
      flushParagraph();
      return;
    }

    // Regular paragraph content
    currentParagraph.push(line);
  });

  // Flush remaining content
  flushParagraph();
  flushCodeBlock(codeBlockLanguage);
  flushTable();

  return elements;
}

export default function DocumentMdModal({ isOpen, onClose, document }: DocumentMdModalProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  // Add null checks to prevent errors
  if (!document) {
    return null;
  }

  const currentContent = showOriginal ? document.md_file_old : document.md_file;
  const hasOriginal = document.md_file_old && document.md_file_old.trim() !== '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {document.titulo || 'Documento'}
          </DialogTitle>
          
          {/* Toolbar */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200 dark:border-[#374151]">
            {!hasOriginal && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Este documento não possui versão original salva
              </p>
            )}
            {hasOriginal && (
              <div className="flex items-center gap-2 ml-auto">
                <Badge variant={showOriginal ? "secondary" : "default"}>
                  {showOriginal ? "Versão Original" : "Versão Atual"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="h-8"
                  title={showOriginal ? "Ver versão atual" : "Ver versão original"}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {showOriginal ? "Ver Atual" : "Ver Original"}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto border-t border-gray-200 dark:border-[#374151] mt-4 pt-4">
          <div className="prose prose-lg max-w-none dark:prose-invert">
            {parseMarkdownToReact(currentContent || '')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}