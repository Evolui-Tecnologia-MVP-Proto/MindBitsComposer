import React from "react";

interface SimpleRichTextDisplayProps {
  content: string;
  onContentChange: (newContent: string) => void;
  onCursorCapture: (position: number) => void;
  placeholder: string;
  className?: string;
}

export default function SimpleRichTextDisplay({ 
  content, 
  onContentChange, 
  onCursorCapture, 
  placeholder, 
  className 
}: SimpleRichTextDisplayProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleCursorEvents = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    onCursorCapture(textarea.selectionStart);
  };

  const renderContent = (text: string) => {
    if (!text) return null;

    // Regex para detectar links no formato [Imagem FreeHand](URL)
    const linkRegex = /\[Imagem FreeHand\]\((\/uploads\/canvas\/[^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Adicionar texto antes do link
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        parts.push(
          <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {beforeText}
          </span>
        );
      }

      // Adicionar o link azul clicável
      const url = match[1];
      parts.push(
        <a
          key={`link-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline cursor-pointer inline-block"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(url, '_blank');
          }}
        >
          Imagem FreeHand
        </a>
      );

      lastIndex = match.index + match[0].length;
    }

    // Adicionar texto restante
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {text.slice(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : (
      <span className="whitespace-pre-wrap">{text}</span>
    );
  };

  return (
    <div className="relative">
      {/* Camada de renderização com links azuis */}
      <div
        className={`${className} pointer-events-none absolute inset-0 overflow-hidden`}
        style={{ 
          minHeight: '8rem',
          backgroundColor: 'transparent',
          zIndex: 2
        }}
      >
        {content ? (
          <div className="p-3 pointer-events-auto">
            {renderContent(content)}
          </div>
        ) : null}
      </div>

      {/* Textarea para edição */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          onContentChange(e.target.value);
          handleCursorEvents(e);
        }}
        onKeyUp={handleCursorEvents}
        onClick={handleCursorEvents}
        className={`${className} relative z-1`}
        placeholder={placeholder}
        style={{
          backgroundColor: content ? 'transparent' : 'white',
          color: content ? 'transparent' : 'inherit'
        }}
      />
    </div>
  );
}