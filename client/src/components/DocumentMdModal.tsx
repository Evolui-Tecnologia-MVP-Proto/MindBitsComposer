import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, RotateCcw } from 'lucide-react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';

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

// MDX Components (same as MarkdownPreview.tsx)
const mdxComponents = {
  h1: (props: any) => <h1 className="text-3xl font-bold mb-6 text-black dark:text-white border-b border-gray-200 dark:border-[#374151] pb-3" {...props} />,
  h2: (props: any) => <h2 className="text-2xl font-semibold mb-4 text-black dark:text-white mt-8" {...props} />,
  h3: (props: any) => <h3 className="text-xl font-medium mb-3 text-black dark:text-white mt-6" {...props} />,
  h4: (props: any) => <h4 className="text-lg font-medium mb-2 text-black dark:text-white mt-4" {...props} />,
  h5: (props: any) => <h5 className="text-base font-medium mb-2 text-black dark:text-white mt-3" {...props} />,
  h6: (props: any) => <h6 className="text-sm font-medium mb-2 text-black dark:text-white mt-2" {...props} />,
  p: (props: any) => <p className="mb-4 leading-relaxed text-black dark:text-white" {...props} />,
  ul: (props: any) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
  ol: (props: any) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
  li: (props: any) => <li className="text-black dark:text-white" {...props} />,
  blockquote: (props: any) => (
    <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 mb-4 bg-gray-50 dark:bg-[#1E293B] italic text-black dark:text-white" {...props} />
  ),
  code: (props: any) => {
    // Inline code
    if (!props.className) {
      return <code className="bg-gray-100 dark:bg-[#1E293B] text-black dark:text-white px-2 py-1 rounded text-sm font-mono" {...props} />;
    }
    // Block code
    return (
      <pre className="bg-gray-900 dark:bg-[#111827] text-white p-4 rounded-lg mb-4 overflow-x-auto">
        <code className="text-sm font-mono text-white" {...props} />
      </pre>
    );
  },
  pre: (props: any) => (
    <pre className="bg-gray-900 dark:bg-[#111827] text-white p-4 rounded-lg mb-4 overflow-x-auto" {...props} />
  ),
  table: (props: any) => (
    <div className="overflow-x-auto mb-4">
      <table className="border-collapse border border-gray-300 dark:border-[#374151] rounded-lg" {...props} />
    </div>
  ),
  thead: (props: any) => <thead className="bg-gray-50 dark:bg-[#111827]" {...props} />,
  tbody: (props: any) => <tbody className="divide-y divide-gray-200 dark:divide-[#374151]" {...props} />,
  tr: (props: any) => <tr className="hover:bg-gray-50 dark:hover:bg-[#1E293B]" {...props} />,
  th: (props: any) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider border-b border-gray-300 dark:border-[#374151] bg-gray-50 dark:bg-[#1B2028]" {...props} />
  ),
  td: (props: any) => <td className="px-4 py-3 text-sm text-black dark:text-white border-b border-gray-200 dark:border-[#374151] bg-white dark:bg-[#1B2028]" {...props} />,
  a: (props: any) => <a className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline" {...props} />,
  img: (props: any) => <img className="max-w-full h-auto rounded-lg shadow-sm mb-4" {...props} />,
  hr: (props: any) => <hr className="my-8 border-gray-300 dark:border-[#374151]" {...props} />,
  strong: (props: any) => <strong className="font-semibold text-black dark:text-white" {...props} />,
  em: (props: any) => <em className="italic text-black dark:text-white" {...props} />,
  // Collapsible containers (details/summary elements)
  details: (props: any) => (
    <details className="mb-4 border border-gray-300 dark:border-[#374151] rounded-lg bg-white dark:bg-[#020203] overflow-hidden" {...props} />
  ),
  summary: (props: any) => (
    <summary className="px-4 py-3 bg-gray-50 dark:bg-[#1E293B] border-b border-gray-300 dark:border-[#374151] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#374151] font-medium text-black dark:text-white select-none" {...props} />
  ),
};

// Process inline formatting like bold, italic, links, and inline images
function processInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Check for images first
    const imageMatch = remaining.match(/!\[(.*?)\]\((.*?)\)/);
    if (imageMatch) {
      const beforeImage = remaining.substring(0, imageMatch.index);
      if (beforeImage) {
        parts.push(beforeImage);
      }
      const [, alt, src] = imageMatch;
      parts.push(
        <img 
          key={key++} 
          src={src} 
          alt={alt} 
          className="inline max-w-full h-auto rounded shadow-sm mx-1" 
          style={{ maxHeight: '200px' }}
        />
      );
      remaining = remaining.substring((imageMatch.index || 0) + imageMatch[0].length);
      continue;
    }

    // Check for links
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const beforeLink = remaining.substring(0, linkMatch.index);
      if (beforeLink) {
        parts.push(beforeLink);
      }
      const [, linkText, linkUrl] = linkMatch;
      parts.push(
        <a 
          key={key++} 
          href={linkUrl} 
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          {linkText}
        </a>
      );
      remaining = remaining.substring((linkMatch.index || 0) + linkMatch[0].length);
      continue;
    }

    // Check for inline code
    const inlineCodeMatch = remaining.match(/`([^`]+)`/);
    if (inlineCodeMatch) {
      const beforeCode = remaining.substring(0, inlineCodeMatch.index);
      if (beforeCode) {
        parts.push(beforeCode);
      }
      const [, codeText] = inlineCodeMatch;
      parts.push(
        <code 
          key={key++} 
          className="bg-gray-100 dark:bg-[#1E293B] text-black dark:text-white px-2 py-1 rounded text-sm font-mono"
        >
          {codeText}
        </code>
      );
      remaining = remaining.substring((inlineCodeMatch.index || 0) + inlineCodeMatch[0].length);
      continue;
    }

    // Check for bold **text**
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    if (boldMatch) {
      const beforeBold = remaining.substring(0, boldMatch.index);
      if (beforeBold) {
        parts.push(beforeBold);
      }
      const [, boldText] = boldMatch;
      parts.push(
        <strong key={key++} className="font-semibold text-black dark:text-white">
          {boldText}
        </strong>
      );
      remaining = remaining.substring((boldMatch.index || 0) + boldMatch[0].length);
      continue;
    }

    // Check for italic *text* (but not **text**)
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);
    if (italicMatch) {
      const beforeItalic = remaining.substring(0, italicMatch.index);
      if (beforeItalic) {
        parts.push(beforeItalic);
      }
      const [, italicText] = italicMatch;
      parts.push(
        <em key={key++} className="italic text-black dark:text-white">
          {italicText}
        </em>
      );
      remaining = remaining.substring((italicMatch.index || 0) + italicMatch[0].length);
      continue;
    }

    // No more special formatting, add remaining text
    parts.push(remaining);
    break;
  }

  return <>{parts}</>;
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
        
        {/* MDX Preview Container - EXACTLY like composer editor */}
        <div className="flex-1 overflow-y-auto border-t border-gray-200 dark:border-[#374151] mt-4 p-6 bg-slate-100 dark:bg-[#020203]">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-[#1B2028] rounded-lg shadow-sm border border-gray-200 dark:border-[#374151] p-6">
              <div className={`md-modal-content markdown-preview markdown-content prose prose-gray dark:prose-invert max-w-none`}>
            <style dangerouslySetInnerHTML={{
              __html: `
                /* Apply EXACTLY the same table styling as Lexical editor to MD modal */
                .md-modal-content.markdown-preview table,
                .md-modal-content .markdown-preview table {
                  background-color: #020203 !important;
                  background: #020203 !important;
                  border: 2px solid #FFFFFF !important;
                  border-collapse: separate !important;
                  border-spacing: 0 !important;
                  border-radius: 8px !important;
                  overflow: hidden !important;
                }
                
                .md-modal-content.markdown-preview thead,
                .md-modal-content .markdown-preview thead,
                .md-modal-content.markdown-preview tbody,
                .md-modal-content .markdown-preview tbody {
                  background-color: #020203 !important;
                  background: #020203 !important;
                }
                
                .md-modal-content.markdown-preview th,
                .md-modal-content .markdown-preview th {
                  background-color: #020203 !important;
                  background: #020203 !important;
                  color: #FFFFFF !important;
                  border: 1px solid #FFFFFF !important;
                  border-color: #FFFFFF !important;
                  padding: 12px 16px !important;
                }
                
                .md-modal-content.markdown-preview td,
                .md-modal-content .markdown-preview td {
                  background-color: #020203 !important;
                  background: #020203 !important;
                  color: #FFFFFF !important;
                  border: 1px solid #FFFFFF !important;
                  border-color: #FFFFFF !important;
                  padding: 12px 16px !important;
                }
                
                .md-modal-content.markdown-preview tr:hover,
                .md-modal-content .markdown-preview tr:hover {
                  background-color: #020203 !important;
                  background: #020203 !important;
                }
                
                .md-modal-content.markdown-preview tr:hover th,
                .md-modal-content .markdown-preview tr:hover th,
                .md-modal-content.markdown-preview tr:hover td,
                .md-modal-content .markdown-preview tr:hover td {
                  background-color: #020203 !important;
                  background: #020203 !important;
                  border-color: #FFFFFF !important;
                }
                
                /* Force all table elements to maintain black background and white borders */
                .md-modal-content.markdown-preview table *,
                .md-modal-content .markdown-preview table * {
                  border-color: #FFFFFF !important;
                }
                .markdown-preview table td {
                  vertical-align: top !important;
                }
                .markdown-preview table td img {
                  display: block !important;
                  max-width: 100% !important;
                  height: auto !important;
                  margin-top: 0 !important;
                }
                .markdown-preview table tbody td {
                  vertical-align: top !important;
                }
                /* Force consistent text colors for all content */
                .markdown-preview,
                .markdown-preview *:not(img):not(svg):not(path):not(circle):not(rect) {
                  color: #000000 !important;
                }
                .dark .markdown-preview,
                .dark .markdown-preview *:not(img):not(svg):not(path):not(circle):not(rect) {
                  color: #FFFFFF !important;
                }
                /* Force text colors for all content inside details elements */
                .markdown-preview details,
                .markdown-preview details *,
                .markdown-preview details p,
                .markdown-preview details span,
                .markdown-preview details div,
                .markdown-preview details li,
                .markdown-preview details strong,
                .markdown-preview details em {
                  color: #000000 !important;
                }
                .dark .markdown-preview details,
                .dark .markdown-preview details *,
                .dark .markdown-preview details p,
                .dark .markdown-preview details span,
                .dark .markdown-preview details div,
                .dark .markdown-preview details li,
                .dark .markdown-preview details strong,
                .dark .markdown-preview details em {
                  color: #FFFFFF !important;
                }
                /* Ensure summary text follows the theme */
                .markdown-preview summary,
                .markdown-preview summary * {
                  color: #000000 !important;
                }
                .dark .markdown-preview summary,
                .dark .markdown-preview summary * {
                  color: #FFFFFF !important;
                }
                /* Content inside details should have proper background and padding */
                .markdown-preview details > *:not(summary) {
                  padding: 16px !important;
                  background-color: white !important;
                  color: #000000 !important;
                }
                .dark .markdown-preview details > *:not(summary) {
                  background-color: #020203 !important;
                  color: #FFFFFF !important;
                }
                /* Force list bullets and numbers to follow theme colors */
                .markdown-preview ul li::marker,
                .markdown-preview ol li::marker {
                  color: #000000 !important;
                }
                .dark .markdown-preview ul li::marker,
                .dark .markdown-preview ol li::marker {
                  color: #FFFFFF !important;
                }
                /* Ensure list items and their content follow theme */
                .markdown-preview ul,
                .markdown-preview ol,
                .markdown-preview ul li,
                .markdown-preview ol li {
                  color: #000000 !important;
                }
                .dark .markdown-preview ul,
                .dark .markdown-preview ol,
                .dark .markdown-preview ul li,
                .dark .markdown-preview ol li {
                  color: #FFFFFF !important;
                }
                /* Force nested lists to maintain colors */
                .markdown-preview ul ul,
                .markdown-preview ul ol,
                .markdown-preview ol ul,
                .markdown-preview ol ol,
                .markdown-preview ul ul li,
                .markdown-preview ul ol li,
                .markdown-preview ol ul li,
                .markdown-preview ol ol li {
                  color: #000000 !important;
                }
                .dark .markdown-preview ul ul,
                .dark .markdown-preview ul ol,
                .dark .markdown-preview ol ul,
                .dark .markdown-preview ol ol,
                .dark .markdown-preview ul ul li,
                .dark .markdown-preview ul ol li,
                .dark .markdown-preview ol ul li,
                .dark .markdown-preview ol ol li {
                  color: #FFFFFF !important;
                }
                /* HTML Table Styling for dangerouslySetInnerHTML tables */
                /* HTML Table Styling with same colors as Lexical editor */
                .md-modal-content .table-html-container table {
                  width: 100% !important;
                  background-color: #020203 !important;
                  background: #020203 !important;
                  border: 2px solid #FFFFFF !important;
                  border-collapse: separate !important;
                  border-spacing: 0 !important;
                  border-radius: 8px !important;
                  overflow: hidden !important;
                }
                .md-modal-content .table-html-container tbody {
                  background-color: #020203 !important;
                  background: #020203 !important;
                  border: none !important;
                }
                .md-modal-content .table-html-container tr {
                  background-color: #020203 !important;
                  background: #020203 !important;
                  border: none !important;
                }
                .md-modal-content .table-html-container tr:hover {
                  background-color: #020203 !important;
                  background: #020203 !important;
                }
                .md-modal-content .table-html-container th {
                  background-color: #020203 !important;
                  background: #020203 !important;
                  border: 1px solid #FFFFFF !important;
                  border-color: #FFFFFF !important;
                  color: #FFFFFF !important;
                }
                .md-modal-content .table-html-container td {
                  background-color: #020203 !important;
                  background: #020203 !important;
                  border: 1px solid #FFFFFF !important;
                  border-color: #FFFFFF !important;
                  color: #FFFFFF !important;
                }
                /* Ensure proper styling for code blocks inside details */
                .markdown-preview details pre {
                  background-color: #1f2937 !important;
                  color: #e5e7eb !important;
                  padding: 12px !important;
                  border-radius: 6px !important;
                  overflow-x: auto !important;
                }
                .dark .markdown-preview details pre {
                  background-color: #111827 !important;
                  color: #d1d5db !important;
                }
                `
                }} />
                <div className="space-y-4">
                  {parseMarkdownToReact(currentContent || '')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}