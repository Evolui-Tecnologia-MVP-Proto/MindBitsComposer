import React, { useEffect, useRef } from 'react';
import { MDXProvider } from '@mdx-js/react';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

// Mermaid diagram component
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

// Custom components for MDX rendering
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
        <a key={key++} href={linkUrl} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">
          {linkText}
        </a>
      );
      remaining = remaining.substring((linkMatch.index || 0) + linkMatch[0].length);
      continue;
    }

    // Check for bold
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    if (boldMatch) {
      const beforeBold = remaining.substring(0, boldMatch.index);
      if (beforeBold) {
        parts.push(beforeBold);
      }
      parts.push(
        <strong key={key++} className="font-semibold text-black dark:text-white">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.substring((boldMatch.index || 0) + boldMatch[0].length);
      continue;
    }

    // Check for italic
    const italicMatch = remaining.match(/\*(.*?)\*/);
    if (italicMatch) {
      const beforeItalic = remaining.substring(0, italicMatch.index);
      if (beforeItalic) {
        parts.push(beforeItalic);
      }
      parts.push(
        <em key={key++} className="italic text-black dark:text-white">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.substring((italicMatch.index || 0) + italicMatch[0].length);
      continue;
    }

    // Check for inline code
    const codeMatch = remaining.match(/`([^`]+)`/);
    if (codeMatch) {
      const beforeCode = remaining.substring(0, codeMatch.index);
      if (beforeCode) {
        parts.push(beforeCode);
      }
      parts.push(
        <code key={key++} className="bg-gray-100 dark:bg-[#1E293B] text-black dark:text-white px-2 py-1 rounded text-sm font-mono">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.substring((codeMatch.index || 0) + codeMatch[0].length);
      continue;
    }

    // No more formatting found, add remaining text
    parts.push(remaining);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// Simple markdown to React renderer
function parseMarkdownToReact(markdown: string): React.ReactNode {
  if (!markdown) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">Nenhum conteúdo para visualizar</p>
        <p className="text-sm mt-2">Adicione texto no editor para ver a prévia</p>
      </div>
    );
  }

  // Função para limpar conteúdo markdown de forma consistente (mesma que LexicalEditor)
  function cleanMarkdownContent(markdown: string): string {
    if (!markdown?.trim()) return markdown;
    
    // Simply trim whitespace and limit excessive newlines without aggressive regex
    return markdown
      .split('\n')
      .map(line => line.trimEnd()) // Remove trailing whitespace only
      .join('\n')
      .replace(/\n{4,}/g, '\n\n\n') // Limit to max 3 consecutive newlines
      .trim();
  }

  // Apply the same cleaning function used in LexicalEditor for consistency
  const cleanMarkdown = cleanMarkdownContent(markdown);

  const lines = cleanMarkdown.split('\n');
  const elements: React.ReactNode[] = [];
  let currentParagraph: string[] = [];
  let inCodeBlock = false;
  let codeBlock: string[] = [];
  let codeBlockLanguage = '';
  let inTable = false;
  let tableRows: string[] = [];
  let orderedListCounter = 0;

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
      
      // Check if it's a Mermaid diagram
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
      // Filter out empty rows and separator rows
      const validRows = tableRows.filter((row: string) => 
        row.trim() !== '' && !row.match(/^\s*\|\s*[-:]+\s*\|\s*[-:]*\s*\|/)
      );
      
      if (validRows.length === 0) {
        tableRows = [];
        return;
      }

      const [headerRow, ...bodyRows] = validRows;
      const headers = headerRow.split('|')
        .map((h: string) => h.trim())
        .slice(1, -1); // Remove first and last empty elements from pipe split
      
      const rows = bodyRows.map((row: string) => {
        const cells = row.split('|')
          .map((cell: string) => {
            // Clean cell content: remove excessive whitespace and normalize line breaks
            return cell.trim()
              .replace(/\n\s*\n/g, '\n') // Remove empty lines within cell content
              .replace(/\s+/g, ' ') // Normalize whitespace to single spaces
              .trim();
          })
          .slice(1, -1); // Remove first and last empty elements from pipe split
        
        // Ensure row has same number of cells as header
        while (cells.length < headers.length) {
          cells.push('');
        }
        
        return cells.slice(0, headers.length); // Trim excess cells
      });

      if (headers.length > 0) {
        elements.push(
          <div key={elements.length} className="overflow-x-auto mb-4">
            <table className="min-w-full border border-gray-300 dark:border-[#374151] rounded-lg">
              <thead className="bg-gray-50 dark:bg-[#111827]">
                <tr>
                  {headers.map((header: string, i: number) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider border-b border-gray-300 dark:border-[#374151] bg-gray-50 dark:bg-[#1B2028]">
                      {processInlineFormatting(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#374151]">
                {rows.map((row: string[], i: number) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#1E293B]">
                    {row.map((cell: string, j: number) => (
                      <td key={j} className="px-4 py-3 text-sm text-black dark:text-white border-b border-gray-200 dark:border-[#374151] bg-white dark:bg-[#1B2028]" style={{ verticalAlign: 'top' }}>
                        {processInlineFormatting(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableRows = [];
    }
  };



  // Handle HTML tables
  let inHtmlTable = false;
  let htmlTableContent: string[] = [];

  const flushHtmlTable = () => {
    if (htmlTableContent.length > 0) {
      const tableHtml = htmlTableContent.join('\n');
      
      // Process HTML table content - show warning for nested tables
      const processHtmlTableContent = (html: string): React.ReactNode => {
        // Check if the table contains nested tables
        const hasNestedTables = (htmlString: string): boolean => {
          // Parse the HTML to check for nested table structures
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlString, 'text/html');
          const mainTable = doc.querySelector('table');
          
          if (!mainTable) return false;
          
          // Check if any cell contains a table
          const cells = mainTable.querySelectorAll('td, th');
          for (let i = 0; i < cells.length; i++) {
            if (cells[i].querySelector('table')) {
              return true;
            }
          }
          return false;
        };
        
        // If table has nested tables, show warning message and suppress HTML completely
        if (hasNestedTables(html)) {
          return (
            <div key={Math.random()} className="mb-4 p-4 border border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-1">
                    Tabela com estrutura aninhada detectada
                  </h4>
                  <p className="text-sm text-orange-700 dark:text-orange-400">
                    O visualizador não suporta a renderização de tabelas aninhadas, considere usar outra alternativa caso isto seja um problema. 
                    Outros renderizadores podem oferecer este suporte, a estrutura do MD está correta e a semântica adequada para processamento por IA.
                  </p>
                </div>
              </div>
            </div>
          );
        }
        
        // Process markdown content inside table cells
        const processMarkdownInCells = (htmlContent: string): string => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlContent, 'text/html');
          const cells = doc.querySelectorAll('td, th');
          
          cells.forEach(cell => {
            let cellContent = cell.innerHTML;
            
            // Handle code blocks (```language code ```)
            cellContent = cellContent.replace(/```(\w+)?\s*([\s\S]*?)```/g, (match, language, code) => {
              const lang = language || '';
              const trimmedCode = code.trim();
              return `<pre class="bg-gray-900 dark:bg-[#111827] text-white p-2 rounded my-1 overflow-x-auto text-xs"><code class="text-xs font-mono text-white">${trimmedCode}</code></pre>`;
            });
            
            // Handle inline code (`code`)
            cellContent = cellContent.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-[#1E293B] text-black dark:text-white px-1 py-0.5 rounded text-xs font-mono">$1</code>');
            
            // Handle bold (**text**)
            cellContent = cellContent.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-black dark:text-white">$1</strong>');
            
            // Handle italic (*text*)
            cellContent = cellContent.replace(/\*(.*?)\*/g, '<em class="italic text-black dark:text-white">$1</em>');
            
            cell.innerHTML = cellContent;
          });
          
          return doc.body.innerHTML;
        };
        
        // Process markdown content in cells before rendering
        const processedHtml = processMarkdownInCells(html);
        
        // For simple tables, render with processed content
        return (
          <div 
            className="overflow-x-auto mb-4 table-html-container"
            dangerouslySetInnerHTML={{ __html: processedHtml }}
            style={{
              // CSS variables for table styling
              '--table-border': '#374151',
              '--table-bg': '#1B2028',
              '--cell-padding': '12px'
            } as React.CSSProperties}
          />
        );
      };
      
      // Render the HTML table directly
      elements.push(processHtmlTableContent(tableHtml));
      
      htmlTableContent = [];
    }
  };

  lines.forEach((line, index) => {
    // Handle HTML table start (with any attributes)
    if (line.trim().match(/^<table[^>]*>/)) {
      flushParagraph();
      inHtmlTable = true;
      htmlTableContent.push(line);
      return;
    }
    
    // Handle HTML table end
    if (line.trim() === '</table>') {
      htmlTableContent.push(line);
      flushHtmlTable();
      inHtmlTable = false;
      return;
    }
    
    // Collect HTML table content
    if (inHtmlTable) {
      htmlTableContent.push(line);
      return;
    }

    // Handle code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock(codeBlockLanguage);
        inCodeBlock = false;
        codeBlockLanguage = '';
      } else {
        flushParagraph();
        inCodeBlock = true;
        // Extract language from the opening fence
        const match = line.match(/^```\s*(\w+)?/);
        codeBlockLanguage = match?.[1] || '';
      }
      return;
    }

    if (inCodeBlock) {
      codeBlock.push(line);
      return;
    }

    // Handle tables
    if (line.includes('|') && line.trim() !== '') {
      if (!inTable) {
        flushParagraph();
        inTable = true;
      }
      // Clean up table row - normalize spaces and ensure proper pipe formatting
      const cleanRow = line.trim()
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/^\s*\|/, '|') // Ensure starts with pipe
        .replace(/\|\s*$/, '|'); // Ensure ends with pipe
      tableRows.push(cleanRow);
      return;
    } else if (inTable && line.trim() !== '') {
      flushTable();
      inTable = false;
    } else if (inTable && line.trim() === '') {
      // Skip empty lines within tables
      return;
    }

    // Handle headings
    if (line.startsWith('#')) {
      flushParagraph();
      const level = line.match(/^#+/)?.[0].length || 1;
      const text = line.replace(/^#+\s*/, '');
      const processedText = processInlineFormatting(text);
      const HeadingComponent = mdxComponents[`h${level}` as keyof typeof mdxComponents] as any;
      elements.push(<HeadingComponent key={elements.length}>{processedText}</HeadingComponent>);
      return;
    }

    // Handle blockquotes
    if (line.startsWith('>')) {
      flushParagraph();
      const text = line.replace(/^>\s*/, '');
      const processedText = processInlineFormatting(text);
      elements.push(
        <blockquote key={elements.length} className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 mb-4 bg-gray-50 dark:bg-[#1E293B] italic text-black dark:text-white">
          {processedText}
        </blockquote>
      );
      return;
    }

    // Handle horizontal rules
    if (line.match(/^---+$/)) {
      flushParagraph();
      elements.push(<hr key={elements.length} className="my-8 border-gray-300" />);
      return;
    }

    // Handle lists - render ordered lists as paragraphs, keep unordered lists as lists
    if (line.match(/^\s*[-*+]\s/) || line.match(/^\s*\d+\.\s/)) {
      flushParagraph();
      const isOrdered = !!line.match(/^\s*\d+\.\s/);
      
      if (isOrdered) {
        // For ordered lists, render as paragraphs preserving the original numbering
        const text = line.replace(/^\s*/, ''); // Keep the number and text
        const processedText = processInlineFormatting(text);
        elements.push(
          <p key={elements.length} className="mb-4 leading-relaxed text-black dark:text-white">
            {processedText}
          </p>
        );
      } else {
        // Keep unordered lists as actual lists
        const text = line.replace(/^\s*(?:[-*+])\s*/, '');
        const processedText = processInlineFormatting(text);
        elements.push(
          <ul key={elements.length} className="list-disc pl-6 mb-4 space-y-2">
            <li className="text-black dark:text-white">{processedText}</li>
          </ul>
        );
      }
      return;
    }

    // Handle standalone images
    if (line.match(/^\s*!\[.*?\]\(.*?\)\s*$/)) {
      flushParagraph();
      const imageMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
      if (imageMatch) {
        const [, alt, src] = imageMatch;
        elements.push(
          <img 
            key={elements.length} 
            src={src} 
            alt={alt} 
            className="max-w-full h-auto rounded-lg shadow-sm mb-4" 
          />
        );
      }
      return;
    }



    // Handle empty lines
    if (line.trim() === '') {
      flushParagraph();
      return;
    }
    
    // Skip HTML table fragments that are not part of a complete table structure
    if (line.trim().match(/^<\/?(?:tbody|tr|td|th)[^>]*>/) || 
        line.trim().match(/style="[^"]*(?:vertical-align|padding)[^"]*"/)) {
      // Suppress isolated HTML table fragments
      return;
    }

    // Regular paragraph content
    currentParagraph.push(line);
  });

  // Flush remaining content
  flushParagraph();
  flushCodeBlock(codeBlockLanguage);
  flushTable();
  flushHtmlTable();

  return elements;
}

export default function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  // Pre-process content to handle inline formatting in HTML elements
  const preprocessContent = (content: string): string => {
    if (!content) return content;
    
    // Process summary elements
    content = content.replace(/<summary[^>]*>(.*?)<\/summary>/g, (match, summaryContent) => {
      const processedContent = summaryContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                             .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                             .replace(/`([^`]+)`/g, '<code>$1</code>');
      return `<summary>${processedContent}</summary>`;
    });
    
    // Process content inside details elements (but not summary)
    content = content.replace(/<details[^>]*>(.*?)<\/details>/g, (match, detailsContent) => {
      // Split into summary and rest
      const summaryMatch = detailsContent.match(/(<summary[^>]*>.*?<\/summary>)(.*)/);
      if (summaryMatch) {
        const [, summary, rest] = summaryMatch;
        const processedRest = rest.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                  .replace(/`([^`]+)`/g, '<code>$1</code>');
        return `<details>${summary}${processedRest}</details>`;
      } else {
        const processedContent = detailsContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                               .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                               .replace(/`([^`]+)`/g, '<code>$1</code>');
        return `<details>${processedContent}</details>`;
      }
    });
    
    return content;
  };

  const processedContent = preprocessContent(content);
  const renderedContent = parseMarkdownToReact(processedContent);

  return (
    <MDXProvider components={mdxComponents}>
      <div className={`markdown-preview markdown-content prose prose-gray dark:prose-invert max-w-none ${className}`}>
        <style dangerouslySetInnerHTML={{
          __html: `
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
              padding: 16px !important;
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
            .table-html-container table {
              width: 100% !important;
              border-collapse: collapse !important;
              border: 1px solid #d1d5db !important;
              border-radius: 8px !important;
              overflow: hidden !important;
            }
            .dark .table-html-container table {
              border: 1px solid #374151 !important;
            }
            .table-html-container tbody {
              border: none !important;
            }
            .table-html-container tr {
              border: none !important;
            }
            .table-html-container tr:hover {
              background-color: #f9fafb !important;
            }
            .dark .table-html-container tr:hover {
              background-color: #1e293b !important;
            }
            .table-html-container td {
              border: 1px solid #e5e7eb !important;
              padding: 12px !important;
              vertical-align: top !important;
              background-color: white !important;
              color: #000000 !important;
            }
            .dark .table-html-container td {
              border: 1px solid #374151 !important;
              background-color: #1b2028 !important;
              color: #ffffff !important;
            }
            /* Nested table styling within cells */
            .table-html-container td table {
              margin: 8px 0 !important;
              border: 1px solid #ccc !important;
              border-collapse: collapse !important;
              width: 100% !important;
            }
            .table-html-container td table td {
              border: 1px solid #ccc !important;
              padding: 8px !important;
              background-color: #f8f9fa !important;
            }
            .dark .table-html-container td table td {
              background-color: #0f172a !important;
              border: 1px solid #4b5563 !important;
            }
          `
        }} />
        <div className="space-y-4">
          {renderedContent}
        </div>
      </div>
    </MDXProvider>
  );
}