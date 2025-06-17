import React from 'react';
import { MDXProvider } from '@mdx-js/react';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
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

  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let currentParagraph: string[] = [];
  let inCodeBlock = false;
  let codeBlock: string[] = [];
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

  const flushCodeBlock = () => {
    if (codeBlock.length > 0) {
      elements.push(
        <pre key={elements.length} className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <code className="text-sm font-mono">{codeBlock.join('\n')}</code>
        </pre>
      );
      codeBlock = [];
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const [headerRow, ...bodyRows] = tableRows;
      const headers = headerRow.split('|').map(h => h.trim()).filter(h => h);
      const rows = bodyRows.filter(row => !row.includes('---')).map(row => 
        row.split('|').map(cell => cell.trim()).filter(cell => cell)
      );

      elements.push(
        <div key={elements.length} className="overflow-x-auto mb-4">
          <table className="min-w-full border border-gray-300 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                {headers.map((header, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-3 text-sm text-gray-700 border-b border-gray-200">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
  };

  lines.forEach((line, index) => {
    // Handle code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        flushParagraph();
        inCodeBlock = true;
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
      tableRows.push(line);
      return;
    } else if (inTable) {
      flushTable();
      inTable = false;
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

    // Handle images
    if (line.match(/!\[.*?\]\(.*?\)/)) {
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
  flushCodeBlock();
  flushTable();

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