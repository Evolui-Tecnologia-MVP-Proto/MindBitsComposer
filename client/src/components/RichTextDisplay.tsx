import React from "react";

interface RichTextDisplayProps {
  content: string;
  onContentChange: (newContent: string) => void;
  onCursorCapture: (position: number) => void;
  placeholder: string;
  className?: string;
}

export default function RichTextDisplay({ 
  content, 
  onContentChange, 
  onCursorCapture, 
  placeholder, 
  className 
}: RichTextDisplayProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(content);
  const editableRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setEditContent(content);
  }, [content]);

  const handleEditStart = () => {
    setIsEditing(true);
    setTimeout(() => {
      if (editableRef.current) {
        editableRef.current.focus();
        // Posicionar cursor no final
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editableRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 10);
  };

  const handleEditEnd = () => {
    setIsEditing(false);
    if (editableRef.current) {
      const newContent = editableRef.current.innerText || '';
      if (newContent !== content) {
        onContentChange(newContent);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleEditEnd();
    }
  };

  const handleInput = () => {
    if (editableRef.current) {
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      if (range) {
        // Capturar posição aproximada do cursor
        const textContent = editableRef.current.innerText || '';
        const cursorPosition = range.startOffset;
        onCursorCapture(cursorPosition);
      }
    }
  };

  const renderEditableContent = (text: string) => {
    if (!text) return '';

    // Regex para detectar links no formato [Imagem FreeHand](URL)
    const linkRegex = /\[Imagem FreeHand\]\((\/uploads\/canvas\/[^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Adicionar texto antes do link
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        parts.push(beforeText);
      }

      // Adicionar o link como elemento clicável
      const url = match[1];
      parts.push(
        `<a href="${url}" target="_blank" rel="noopener noreferrer" 
           class="text-blue-600 hover:text-blue-800 underline cursor-pointer"
           onclick="event.preventDefault(); window.open('${url}', '_blank');">
           Imagem FreeHand
         </a>`
      );

      lastIndex = match.index + match[0].length;
    }

    // Adicionar texto restante
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.join('');
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

      // Adicionar o link
      const url = match[1];
      parts.push(
        <a
          key={`link-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
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

  if (isEditing) {
    return (
      <div
        ref={editableRef}
        contentEditable
        suppressContentEditableWarning
        className={`${className} focus:outline-none`}
        onBlur={handleEditEnd}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        dangerouslySetInnerHTML={{
          __html: renderEditableContent(content) || `<span style="color: #9CA3AF;">${placeholder}</span>`
        }}
      />
    );
  }

  return (
    <div
      className={`${className} cursor-text bg-white`}
      onClick={handleEditStart}
      style={{ minHeight: '8rem' }}
    >
      {content ? (
        renderContent(content)
      ) : (
        <span className="text-gray-500">{placeholder}</span>
      )}
    </div>
  );
}