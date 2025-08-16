import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Code, GitCompare } from 'lucide-react';
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

type ViewMode = 'mdx' | 'raw' | 'diff';

// Mermaid diagram component
function MermaidDiagram({ chart }: { chart: string }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elementRef.current && chart.trim()) {
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
          tertiaryColor: '#111827',
          edgeLabelBackground: '#333B4D',
          labelBackground: '#333B4D',
          labelTextColor: '#FFFFFF',
          edgeLabelColor: '#FFFFFF',
        } : {}
      });

      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      const cleanChart = chart.trim();
      
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

// MDX Components
const mdxComponents = {
  h1: (props: any) => <h1 className="text-3xl font-bold mb-6 text-black dark:text-white border-b border-gray-200 dark:border-[#111827] pb-3" {...props} />,
  h2: (props: any) => <h2 className="text-2xl font-semibold mb-4 text-black dark:text-white mt-8" {...props} />,
  h3: (props: any) => <h3 className="text-xl font-semibold mb-3 text-black dark:text-white mt-6" {...props} />,
  h4: (props: any) => <h4 className="text-lg font-semibold mb-2 text-black dark:text-white mt-4" {...props} />,
  h5: (props: any) => <h5 className="text-base font-semibold mb-2 text-black dark:text-white mt-3" {...props} />,
  h6: (props: any) => <h6 className="text-sm font-semibold mb-2 text-black dark:text-white mt-2" {...props} />,
  p: (props: any) => <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed" {...props} />,
  a: (props: any) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
  ul: (props: any) => <ul className="mb-4 pl-6 list-disc text-gray-700 dark:text-gray-300" {...props} />,
  ol: (props: any) => <ol className="mb-4 pl-6 list-decimal text-gray-700 dark:text-gray-300" {...props} />,
  li: (props: any) => <li className="mb-1" {...props} />,
  blockquote: (props: any) => (
    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 italic text-gray-700 dark:text-gray-300" {...props} />
  ),
  code: ({ className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    
    if (language === 'mermaid') {
      return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
    }

    if (!match) {
      return (
        <code className="bg-gray-100 dark:bg-[#1B2028] px-2 py-1 rounded text-sm font-mono text-gray-800 dark:text-gray-200" {...props}>
          {children}
        </code>
      );
    }

    return (
      <div className="my-4">
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <code className="text-sm font-mono">{children}</code>
        </pre>
      </div>
    );
  },
  pre: (props: any) => <div {...props} />,
  table: (props: any) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden" {...props} />
    </div>
  ),
  thead: (props: any) => <thead className="bg-gray-50 dark:bg-[#1B2028]" {...props} />,
  tbody: (props: any) => <tbody {...props} />,
  tr: (props: any) => <tr className="border-b border-gray-200 dark:border-gray-700" {...props} />,
  th: (props: any) => <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100" {...props} />,
  td: (props: any) => <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300" {...props} />,
  strong: (props: any) => <strong className="font-bold text-black dark:text-white" {...props} />,
  em: (props: any) => <em className="italic text-gray-700 dark:text-gray-300" {...props} />,
  hr: (props: any) => <hr className="my-6 border-gray-300 dark:border-gray-600" {...props} />,
};

function parseMarkdownToReact(content: string): React.ReactElement[] {
  const elements: React.ReactElement[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      i++;
      continue;
    }

    // Mermaid code blocks
    if (trimmedLine === '```mermaid') {
      let mermaidContent = '';
      i++;
      while (i < lines.length && lines[i].trim() !== '```') {
        mermaidContent += lines[i] + '\n';
        i++;
      }
      elements.push(
        <div key={elements.length} className="my-4">
          <MermaidDiagram chart={mermaidContent.trim()} />
        </div>
      );
      i++;
      continue;
    }

    // Regular code blocks
    if (trimmedLine.startsWith('```')) {
      const language = trimmedLine.slice(3);
      let codeContent = '';
      i++;
      while (i < lines.length && lines[i].trim() !== '```') {
        codeContent += lines[i] + '\n';
        i++;
      }
      elements.push(
        <div key={elements.length} className="my-4">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code className="text-sm font-mono">{codeContent.trim()}</code>
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // Headers
    if (trimmedLine.startsWith('#')) {
      const level = trimmedLine.match(/^#+/)?.[0].length || 1;
      const text = trimmedLine.replace(/^#+\s*/, '');
      const HeaderComponent = mdxComponents[`h${level}` as keyof typeof mdxComponents] || mdxComponents.h1;
      elements.push(
        <HeaderComponent key={elements.length}>
          {text}
        </HeaderComponent>
      );
      i++;
      continue;
    }

    // Tables
    if (trimmedLine.includes('|')) {
      const tableRows: string[] = [];
      while (i < lines.length && lines[i].trim().includes('|')) {
        tableRows.push(lines[i]);
        i++;
      }
      
      if (tableRows.length > 0) {
        const [headerRow, ...bodyRows] = tableRows;
        const headers = headerRow.split('|').map(h => h.trim()).filter(h => h);
        
        elements.push(
          <div key={elements.length} className="my-4 overflow-x-auto">
            <table className="w-full border-collapse border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 dark:bg-[#1B2028]">
                <tr>
                  {headers.map((header, idx) => (
                    <th key={idx} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.filter(row => !row.includes('---')).map((row, rowIdx) => {
                  const cells = row.split('|').map(c => c.trim()).filter(c => c);
                  return (
                    <tr key={rowIdx} className="border-b border-gray-200 dark:border-gray-700">
                      {cells.map((cell, cellIdx) => (
                        <td key={cellIdx} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Paragraphs and other content
    elements.push(
      <p key={elements.length} className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
        {trimmedLine}
      </p>
    );
    i++;
  }

  return elements;
}

function RawTextView({ content }: { content: string }) {
  const lines = content.split('\n');
  
  return (
    <div className="text-gray-100 dark:text-gray-300 p-4 rounded-lg font-mono text-sm overflow-x-auto bg-[#111827]">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, index) => (
            <tr key={index}>
              <td className="pr-4 text-gray-500 dark:text-gray-400 text-right select-none w-12 align-top bg-[#1B2028]">
                {index + 1}
              </td>
              <td className="text-gray-100 dark:text-gray-300 whitespace-pre-wrap break-words bg-[#1B2028]">
                {line || '\u00A0'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiffView({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const maxLines = Math.max(oldLines.length, newLines.length);
  
  interface DiffLine {
    lineNumber?: number;
    content: string;
    type: 'unchanged' | 'added' | 'removed';
  }
  
  const diffLines: DiffLine[] = [];
  
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    
    if (oldLine === newLine) {
      diffLines.push({
        lineNumber: i + 1,
        content: oldLine || '',
        type: 'unchanged'
      });
    } else if (oldLine !== undefined && newLine !== undefined) {
      if (oldLine) {
        diffLines.push({
          lineNumber: i + 1,
          content: oldLine,
          type: 'removed'
        });
      }
      if (newLine) {
        diffLines.push({
          lineNumber: i + 1,
          content: newLine,
          type: 'added'
        });
      }
    } else if (oldLine !== undefined) {
      diffLines.push({
        lineNumber: i + 1,
        content: oldLine,
        type: 'removed'
      });
    } else if (newLine !== undefined) {
      diffLines.push({
        lineNumber: i + 1,
        content: newLine,
        type: 'added'
      });
    }
  }

  const getLineStyle = (type: DiffLine['type']) => {
    switch (type) {
      case 'added':
        return 'bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500';
      case 'removed':
        return 'bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500';
      default:
        return 'bg-white dark:bg-[#1B2028]';
    }
  };

  const getLinePrefix = (type: DiffLine['type']) => {
    switch (type) {
      case 'added':
        return '+';
      case 'removed':
        return '-';
      default:
        return '';
    }
  };

  return (
    <div className="text-gray-100 dark:text-gray-300 p-4 rounded-lg font-mono text-sm overflow-x-auto bg-[#111827]">
      <table className="w-full border-collapse">
        <tbody>
          {diffLines.map((line, index) => (
            <tr key={index} className={getLineStyle(line.type)}>
              <td className="pr-2 text-gray-500 dark:text-gray-400 text-right select-none w-8 align-top bg-[#1B2028]">
                {line.lineNumber || ''}
              </td>
              <td className="pr-2 text-gray-600 dark:text-gray-300 text-center select-none w-6 align-top bg-[#1B2028]">
                {getLinePrefix(line.type)}
              </td>
              <td className="text-gray-100 dark:text-gray-300 whitespace-pre-wrap break-words pl-2 bg-[#1B2028]">
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
                  title="Comparação entre versões"
                >
                  <GitCompare className="w-4 h-4 mr-1" />
                  Diff
                </Button>
              )}
            </div>
            
            {hasOriginal && viewMode !== 'diff' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Versão:</span>
                <Button
                  variant={!showOriginal ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOriginal(false)}
                  className="h-8 text-xs px-2"
                >
                  Atual
                </Button>
                <Button
                  variant={showOriginal ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOriginal(true)}
                  className="h-8 text-xs px-2"
                >
                  Original
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto border-t border-gray-200 dark:border-[#111827] mt-4 p-6 bg-slate-100 dark:bg-[#020203]">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-[#111827] rounded-lg shadow-sm border border-gray-200 dark:border-[#111827] p-6">
              
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