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
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setEditContent(content);
  }, [content]);

  const handleEditStart = () => {
    setIsEditing(true);
    setEditContent(content);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 10);
  };

  const handleEditEnd = () => {
    setIsEditing(false);
    if (editContent !== content) {
      onContentChange(editContent);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditContent(content);
      setIsEditing(false);
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleEditEnd();
    }
  };

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
      <textarea
        ref={textareaRef}
        value={editContent}
        onChange={(e) => {
          setEditContent(e.target.value);
          handleCursorEvents(e);
        }}
        onKeyUp={handleCursorEvents}
        onClick={handleCursorEvents}
        onBlur={handleEditEnd}
        onKeyDown={handleKeyDown}
        className={className}
        placeholder={placeholder}
        autoFocus
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