import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Code, GitCompare } from 'lucide-react';
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
  h1: (props: any) => <h1 className="text-3xl font-bold mb-6 text-black dark:text-white border-b border-gray-200 dark:border-[#111827] pb-3" {...props} />,
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
    <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 mb-4 bg-gray-50 dark:bg-[#1B2028] italic text-black dark:text-white" {...props} />
  ),
  code: (props: any) => {
    // Inline code
    if (!props.className) {
      return <code className="bg-gray-100 dark:bg-[#1B2028] text-black dark:text-white px-2 py-1 rounded text-sm font-mono" {...props} />;
    }
    // Block code
    return (
      <pre className="bg-gray-900 dark:bg-[#1B2028] text-white p-4 rounded-lg mb-4 overflow-x-auto">
        <code className="text-sm font-mono text-white" {...props} />
      </pre>
    );
  },
  pre: (props: any) => (
    <pre className="bg-gray-900 dark:bg-[#1B2028] text-white p-4 rounded-lg mb-4 overflow-x-auto" {...props} />
  ),
  table: (props: any) => (
    <div className="overflow-x-auto mb-4">
      <table className="border-collapse border border-gray-300 dark:border-[#111827] rounded-lg" {...props} />
    </div>
  ),
  thead: (props: any) => <thead className="bg-gray-50 dark:bg-[#1B2028]" {...props} />,
  tbody: (props: any) => <tbody className="divide-y divide-gray-200 dark:divide-[#111827]" {...props} />,
  tr: (props: any) => <tr className="hover:bg-gray-50 dark:hover:bg-[#1B2028]" {...props} />,
  th: (props: any) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider border-b border-gray-300 dark:border-[#111827] bg-gray-50 dark:bg-[#1B2028]" {...props} />
  ),
  td: (props: any) => <td className="px-4 py-3 text-sm text-black dark:text-white border-b border-gray-200 dark:border-[#111827] bg-white dark:bg-[#1B2028]" {...props} />,
  a: (props: any) => <a className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline" {...props} />,
  img: (props: any) => <img className="max-w-full h-auto rounded-lg shadow-sm mb-4" {...props} />,
  hr: (props: any) => <hr className="my-8 border-gray-300 dark:border-[#111827]" {...props} />,
  strong: (props: any) => <strong className="font-semibold text-black dark:text-white" {...props} />,
  em: (props: any) => <em className="italic text-black dark:text-white" {...props} />,
  // Collapsible containers (details/summary elements)
  details: (props: any) => (
    <details className="mb-4 border border-gray-300 dark:border-[#111827] rounded-lg bg-white dark:bg-[#1B2028] overflow-hidden" {...props} />
  ),
  summary: (props: any) => (
    <summary className="px-4 py-3 bg-gray-50 dark:bg-[#1B2028] border-b border-gray-300 dark:border-[#111827] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1B2028] font-medium text-black dark:text-white select-none" {...props} />
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

// Tipos para modos de visualização
type ViewMode = 'mdx' | 'raw' | 'diff';

// Interface para linha do diff
interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  content: string;
  lineNumber?: number;
  oldLineNumber?: number;
  newLineNumber?: number;
}

// Função para calcular diff entre dois textos
function calculateDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];
  
  let oldIndex = 0;
  let newIndex = 0;
  let oldLineNum = 1;
  let newLineNum = 1;
  
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    const oldLine = oldLines[oldIndex];
    const newLine = newLines[newIndex];
    
    if (oldIndex >= oldLines.length) {
      // Linhas adicionadas no final
      result.push({
        type: 'added',
        content: newLine,
        newLineNumber: newLineNum,
        lineNumber: newLineNum
      });
      newIndex++;
      newLineNum++;
    } else if (newIndex >= newLines.length) {
      // Linhas removidas no final
      result.push({
        type: 'removed',
        content: oldLine,
        oldLineNumber: oldLineNum,
        lineNumber: oldLineNum
      });
      oldIndex++;
      oldLineNum++;
    } else if (oldLine === newLine) {
      // Linhas iguais
      result.push({
        type: 'unchanged',
        content: oldLine,
        oldLineNumber: oldLineNum,
        newLineNumber: newLineNum,
        lineNumber: newLineNum
      });
      oldIndex++;
      newIndex++;
      oldLineNum++;
      newLineNum++;
    } else {
      // Buscar por linhas correspondentes nas próximas linhas
      let foundMatch = false;
      
      // Verificar se a linha atual do novo texto existe mais adiante no texto antigo
      for (let i = oldIndex + 1; i < Math.min(oldIndex + 5, oldLines.length); i++) {
        if (oldLines[i] === newLine) {
          // Linha foi adicionada (todas as linhas entre oldIndex e i foram removidas)
          for (let j = oldIndex; j < i; j++) {
            result.push({
              type: 'removed',
              content: oldLines[j],
              oldLineNumber: oldLineNum,
              lineNumber: oldLineNum
            });
            oldLineNum++;
          }
          result.push({
            type: 'unchanged',
            content: newLine,
            oldLineNumber: oldLineNum,
            newLineNumber: newLineNum,
            lineNumber: newLineNum
          });
          oldIndex = i + 1;
          newIndex++;
          oldLineNum++;
          newLineNum++;
          foundMatch = true;
          break;
        }
      }
      
      if (!foundMatch) {
        // Verificar se a linha atual do texto antigo existe mais adiante no novo texto
        for (let i = newIndex + 1; i < Math.min(newIndex + 5, newLines.length); i++) {
          if (newLines[i] === oldLine) {
            // Linhas foram adicionadas
            for (let j = newIndex; j < i; j++) {
              result.push({
                type: 'added',
                content: newLines[j],
                newLineNumber: newLineNum,
                lineNumber: newLineNum
              });
              newLineNum++;
            }
            result.push({
              type: 'unchanged',
              content: oldLine,
              oldLineNumber: oldLineNum,
              newLineNumber: newLineNum,
              lineNumber: newLineNum
            });
            oldIndex++;
            newIndex = i + 1;
            oldLineNum++;
            newLineNum++;
            foundMatch = true;
            break;
          }
        }
      }
      
      if (!foundMatch) {
        // Linha modificada
        result.push({
          type: 'modified',
          content: newLine,
          oldLineNumber: oldLineNum,
          newLineNumber: newLineNum,
          lineNumber: newLineNum
        });
        oldIndex++;
        newIndex++;
        oldLineNum++;
        newLineNum++;
      }
    }
  }
  
  return result;
}

// Componente para visualização de texto puro com numeração
function RawTextView({ content }: { content: string }) {
  const lines = content.split('\n');
  
  return (
    <div className="dark:bg-[#1B2028] text-gray-100 dark:text-gray-300 p-4 rounded-lg font-mono text-sm overflow-x-auto bg-[#1b2028]">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, index) => (
            <tr key={index}>
              <td className="pr-4 text-gray-500 dark:text-gray-400 text-right select-none w-3 align-top bg-transparent dark:bg-[#1B2028]">
                {index + 1}
              </td>
              <td className="text-gray-100 dark:text-gray-300 whitespace-pre-wrap break-words bg-transparent dark:bg-[#1B2028]">
                {line || '\u00A0'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Componente para visualização de diff
function DiffView({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  const diffLines = calculateDiff(oldContent, newContent);
  
  const getLineStyle = (type: DiffLine['type']) => {
    switch (type) {
      case 'added':
        return 'bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500';
      case 'removed':
        return 'bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500';
      case 'modified':
        return 'bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500';
      default:
        return 'bg-gray-50 dark:bg-gray-800/50';
    }
  };
  
  const getLinePrefix = (type: DiffLine['type']) => {
    switch (type) {
      case 'added':
        return '+';
      case 'removed':
        return '-';
      case 'modified':
        return '~';
      default:
        return ' ';
    }
  };
  
  return (
    <div className="dark:bg-[#1B2028] text-gray-100 dark:text-gray-300 p-4 rounded-lg font-mono text-sm overflow-x-auto bg-[#1b2028]">
      <div className="mb-4 text-xs text-gray-400 border-b border-gray-600 pb-2">
        <span className="inline-block w-4 h-4 bg-blue-500 rounded mr-2"></span>Adicionado
        <span className="inline-block w-4 h-4 bg-yellow-500 rounded mr-2 ml-4"></span>Modificado
        <span className="inline-block w-4 h-4 bg-red-500 rounded mr-2 ml-4"></span>Removido
      </div>
      <table className="w-full border-collapse">
        <tbody>
          {diffLines.map((line, index) => (
            <tr key={index} className={getLineStyle(line.type)}>
              <td className="pr-2 text-gray-500 dark:text-gray-400 text-right select-none w-2 align-top bg-transparent dark:bg-[#1B2028]">
                {line.lineNumber || ''}
              </td>
              <td className="pr-2 text-gray-600 dark:text-gray-300 text-center select-none w-6 align-top bg-transparent dark:bg-[#1B2028]">
                {getLinePrefix(line.type)}
              </td>
              <td className="text-gray-100 dark:text-gray-300 whitespace-pre-wrap break-words pl-2 bg-transparent dark:bg-[#1B2028]">
                {line.content || '\u00A0'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocumentMdModal({ isOpen, onClose, document }: DocumentMdModalProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('mdx');

  // Add null checks to prevent errors
  if (!document) {
    return null;
  }

  const currentContent = showOriginal ? document.md_file_old : document.md_file;
  const hasOriginal = document.md_file_old && document.md_file_old.trim() !== '';
  const hasBothVersions = document.md_file && document.md_file_old && 
                          document.md_file.trim() !== '' && document.md_file_old.trim() !== '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {document.titulo || 'Documento'}
          </DialogTitle>
          
          {/* Toolbar */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200 dark:border-[#111827]">
            <div className="flex items-center gap-2">
              {/* Botões de modo de visualização */}
              <Button
                variant={viewMode === 'mdx' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('mdx')}
                className="h-8"
                title="Visualização MDX renderizada"
              >
                <FileText className="w-4 h-4 mr-1" />
                MDX
              </Button>
              <Button
                variant={viewMode === 'raw' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('raw')}
                className="h-8"
                title="Visualização de texto puro com numeração"
              >
                <Code className="w-4 h-4 mr-1" />
                Texto
              </Button>
              {hasBothVersions && (
                <Button
                  variant={viewMode === 'diff' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode('diff')}
                  className="h-8"
                  title="Comparação entre versões (diff)"
                >
                  <GitCompare className="w-4 h-4 mr-1" />
                  Diff
                </Button>
              )}
            </div>
            
            {!hasOriginal && viewMode === 'mdx' && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Documento em versão única, ou com processo de revisão ainda não iniciado
              </p>
            )}
            
            {/* Botões de versão - apenas para modo MDX e Raw */}
            {hasOriginal && (viewMode === 'mdx' || viewMode === 'raw') && (
              <div className="flex items-center gap-2">
                <Button
                  variant={!showOriginal ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOriginal(false)}
                  className="h-8"
                  title="Ver versão atual"
                >
                  Atual
                </Button>
                <Button
                  variant={showOriginal ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOriginal(true)}
                  className="h-8"
                  title="Ver versão original"
                >
                  Original
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>
        
        {/* MDX Preview Container - EXACTLY like composer editor */}
        <div className="flex-1 overflow-y-auto border-t border-gray-200 dark:border-[#111827] mt-4 p-6 bg-slate-100 dark:bg-[#020203]">
          <div className="max-w-4xl mx-auto">
            <div className="dark:bg-[#1B2028] rounded-lg shadow-sm border border-gray-200 dark:border-[#111827] p-6 bg-[#1b2028]">
              {/* Renderização baseada no modo */}
              {viewMode === 'mdx' && (
                <div className={`md-modal-content markdown-preview markdown-content prose prose-gray dark:prose-invert max-w-none`}>
                  <style dangerouslySetInnerHTML={{
                    __html: `
                    /* CSS styling simplificado para o modo MDX */
                    .md-modal-content table {
                      width: 100% !important;
                      border: 2px solid #000000 !important;
                      border-collapse: separate !important;
                      border-spacing: 0 !important;
                      border-radius: 8px !important;
                      overflow: hidden !important;
                    }
                    .dark .md-modal-content table {
                      border: 2px solid #FFFFFF !important;
                    }
                    .md-modal-content th,
                    .md-modal-content td {
                      border: 1px solid #000000 !important;
                      padding: 12px 16px !important;
                      vertical-align: top !important;
                    }
                    .dark .md-modal-content th,
                    .dark .md-modal-content td {
                      border: 1px solid #FFFFFF !important;
                    }
                    `
                  }} />
                  <div className="space-y-4">
                    {parseMarkdownToReact(currentContent || '')}
                  </div>
                </div>
              )}
              
              {viewMode === 'raw' && (
                <RawTextView content={currentContent || ''} />
              )}
              
              {viewMode === 'diff' && hasBothVersions && (
                <DiffView 
                  oldContent={document.md_file_old || ''} 
                  newContent={document.md_file || ''} 
                />
              )}
              
              {viewMode === 'diff' && !hasBothVersions && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <GitCompare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Diff não disponível</p>
                  <p className="text-sm mt-2">É necessário ter as duas versões do documento para comparação</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}