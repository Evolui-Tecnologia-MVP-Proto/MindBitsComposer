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
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
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
  h1: (props: any) => <h1 className="text-3xl font-bold mb-6 text-gray-900 border-b border-gray-200 pb-3" {...props} />,
  h2: (props: any) => <h2 className="text-2xl font-semibold mb-4 text-gray-800 mt-8" {...props} />,
  h3: (props: any) => <h3 className="text-xl font-medium mb-3 text-gray-700 mt-6" {...props} />,
  h4: (props: any) => <h4 className="text-lg font-medium mb-2 text-gray-700 mt-4" {...props} />,
  h5: (props: any) => <h5 className="text-base font-medium mb-2 text-gray-600 mt-3" {...props} />,
  h6: (props: any) => <h6 className="text-sm font-medium mb-2 text-gray-600 mt-2" {...props} />,
  p: (props: any) => <p className="mb-4 leading-relaxed text-gray-700" {...props} />,
  ul: (props: any) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
  ol: (props: any) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
  li: (props: any) => <li className="text-gray-700" {...props} />,
  blockquote: (props: any) => (
    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-4 bg-gray-50 italic text-gray-600" {...props} />
  ),
  code: (props: any) => {
    // Inline code
    if (!props.className) {
      return <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono" {...props} />;
    }
    // Block code
    return (
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
        <code className="text-sm font-mono" {...props} />
      </pre>
    );
  },
  pre: (props: any) => (
    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto" {...props} />
  ),
  table: (props: any) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border border-gray-300 rounded-lg" {...props} />
    </div>
  ),
  thead: (props: any) => <thead className="bg-gray-50" {...props} />,
  tbody: (props: any) => <tbody className="divide-y divide-gray-200" {...props} />,
  tr: (props: any) => <tr className="hover:bg-gray-50" {...props} />,
  th: (props: any) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300" {...props} />
  ),
  td: (props: any) => <td className="px-4 py-3 text-sm text-gray-700 border-b border-gray-200" {...props} />,
  a: (props: any) => <a className="text-blue-600 hover:text-blue-800 underline" {...props} />,
  img: (props: any) => <img className="max-w-full h-auto rounded-lg shadow-sm mb-4" {...props} />,
  hr: (props: any) => <hr className="my-8 border-gray-300" {...props} />,
  strong: (props: any) => <strong className="font-semibold text-gray-900" {...props} />,
  em: (props: any) => <em className="italic text-gray-700" {...props} />,
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
        <a key={key++} href={linkUrl} className="text-blue-600 hover:text-blue-800 underline">
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
        <strong key={key++} className="font-semibold text-gray-900">
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
        <em key={key++} className="italic text-gray-700">
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
        <code key={key++} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">
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

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const content = currentParagraph.join('\n').trim();
      if (content) {
        const processedContent = processInlineFormatting(content);
        elements.push(<p key={elements.length} className="mb-4 leading-relaxed text-gray-700">{processedContent}</p>);
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
          <pre key={elements.length} className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
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
        .filter((h: string) => h !== '');
      
      const rows = bodyRows.map((row: string) => {
        const cells = row.split('|')
          .map((cell: string) => {
            // Clean cell content: remove excessive whitespace and normalize line breaks
            return cell.trim()
              .replace(/\n\s*\n/g, '\n') // Remove empty lines within cell content
              .replace(/\s+/g, ' ') // Normalize whitespace to single spaces
              .trim();
          })
          .filter((cell: string) => cell !== '');
        
        // Ensure row has same number of cells as header
        while (cells.length < headers.length) {
          cells.push('');
        }
        
        return cells.slice(0, headers.length); // Trim excess cells
      });

      if (headers.length > 0) {
        elements.push(
          <div key={elements.length} className="overflow-x-auto mb-4">
            <table className="min-w-full border border-gray-300 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header: string, i: number) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                      {processInlineFormatting(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((row: string[], i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {row.map((cell: string, j: number) => (
                      <td key={j} className="px-4 py-3 text-sm text-gray-700 border-b border-gray-200 align-top">
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
      
      // Parse the HTML table and convert to React components
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${tableHtml}</div>`, 'text/html');
      const tableElement = doc.querySelector('table');
      
      if (tableElement) {
        const headers: string[] = [];
        const rows: string[][] = [];
        
        // Extract headers
        const headerRows = tableElement.querySelectorAll('thead tr');
        headerRows.forEach(headerRow => {
          const headerCells = headerRow.querySelectorAll('th');
          headerCells.forEach(cell => {
            headers.push(cell.textContent || '');
          });
        });
        
        // Extract body rows
        const bodyRows = tableElement.querySelectorAll('tbody tr');
        bodyRows.forEach(bodyRow => {
          const row: string[] = [];
          const cells = bodyRow.querySelectorAll('td');
          cells.forEach(cell => {
            // Check if cell contains an image
            const img = cell.querySelector('img');
            if (img) {
              const src = img.getAttribute('src') || '';
              const alt = img.getAttribute('alt') || '';
              row.push(`![${alt}](${src})`);
            } 
            // Check if cell contains Mermaid code (with language-mermaid class)
            else if (cell.querySelector('pre code.language-mermaid')) {
              const codeContent = cell.querySelector('pre code')?.textContent || '';
              row.push(`\`\`\`mermaid\n${codeContent}\n\`\`\``);
            }
            // Check if cell contains regular code block
            else if (cell.querySelector('pre code:not(.language-mermaid)')) {
              const codeContent = cell.querySelector('pre code')?.textContent || '';
              row.push(`\`\`\`\n${codeContent}\n\`\`\``);
            }
            // Regular text content
            else {
              row.push(cell.textContent || '');
            }
          });
          rows.push(row);
        });
        
        // Render as custom table component
        if (headers.length > 0) {
          elements.push(
            <div key={elements.length} className="overflow-x-auto mb-4">
              <table className="min-w-full border border-gray-300 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map((header: string, i: number) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                        {processInlineFormatting(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row: string[], i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {row.map((cell: string, j: number) => (
                        <td key={j} className="px-4 py-3 text-sm text-gray-700 border-b border-gray-200 align-top">
                          {/* Handle Mermaid diagrams in cells */}
                          {cell.startsWith('```mermaid') ? (
                            <MermaidDiagram chart={cell.replace(/```mermaid\n|\n```/g, '')} />
                          ) : cell.startsWith('```\n') && cell.endsWith('\n```') ? (
                            <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
                              <code>{cell.replace(/```\n|\n```/g, '')}</code>
                            </pre>
                          ) : (
                            processInlineFormatting(cell)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
      }
      
      htmlTableContent = [];
    }
  };

  lines.forEach((line, index) => {
    // Handle HTML table start
    if (line.trim() === '<table>') {
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
        .replace(/\|\s*\|\s*\|/g, '| |') // Fix empty cells with multiple pipes
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
      const HeadingComponent = mdxComponents[`h${level}` as keyof typeof mdxComponents] as any;
      elements.push(<HeadingComponent key={elements.length}>{text}</HeadingComponent>);
      return;
    }

    // Handle blockquotes
    if (line.startsWith('>')) {
      flushParagraph();
      const text = line.replace(/^>\s*/, '');
      elements.push(
        <blockquote key={elements.length} className="border-l-4 border-blue-500 pl-4 py-2 mb-4 bg-gray-50 italic text-gray-600">
          {text}
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

    // Handle lists
    if (line.match(/^\s*[-*+]\s/) || line.match(/^\s*\d+\.\s/)) {
      flushParagraph();
      const isOrdered = line.match(/^\s*\d+\.\s/);
      const text = line.replace(/^\s*(?:[-*+]|\d+\.)\s*/, '');
      const ListComponent = isOrdered ? mdxComponents.ol : mdxComponents.ul;
      elements.push(
        <ListComponent key={elements.length}>
          <li className="text-gray-700">{text}</li>
        </ListComponent>
      );
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
  const renderedContent = parseMarkdownToReact(content);

  return (
    <MDXProvider components={mdxComponents}>
      <div className={`markdown-preview prose prose-gray max-w-none ${className}`}>
        <div className="space-y-4">
          {renderedContent}
        </div>
      </div>
    </MDXProvider>
  );
}