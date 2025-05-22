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
    // Se não estamos editando, forçar re-render para mostrar links
    if (!isEditing && editableRef.current) {
      // Garantir que o componente sempre mostre a versão formatada
      setTimeout(() => setIsEditing(false), 10);
    }
  }, [content, isEditing]);

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
      // Primeiro, converter links HTML de volta para markdown
      let htmlContent = editableRef.current.innerHTML || '';
      
      // Converter links HTML para formato markdown
      htmlContent = htmlContent.replace(
        /<a[^>]*href="([^"]*)"[^>]*>Imagem FreeHand<\/a>/g,
        '[Imagem FreeHand]($1)'
      );
      
      // Criar elemento temporário para extrair texto
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      let newContent = tempDiv.innerText || tempDiv.textContent || '';
      
      // Limpar quebras de linha extras dos elementos HTML
      newContent = newContent.replace(/\s+/g, ' ').trim();
      
      console.log('Conteúdo final após edição:', newContent);
      
      if (newContent !== content && newContent !== placeholder) {
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
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Calcular posição real do cursor no texto
        const textBeforeCursor = range.cloneRange();
        textBeforeCursor.selectNodeContents(editableRef.current);
        textBeforeCursor.setEnd(range.startContainer, range.startOffset);
        
        const textContent = textBeforeCursor.toString();
        const cursorPosition = textContent.length;
        
        console.log('Posição do cursor capturada:', cursorPosition);
        onCursorCapture(cursorPosition);
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    // Capturar posição em navegação com teclas
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      handleInput();
    }
  };

  const handleMouseUp = () => {
    // Capturar posição ao clicar ou selecionar
    setTimeout(handleInput, 10);
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
        onKeyUp={handleKeyUp}
        onInput={handleInput}
        onMouseUp={handleMouseUp}
        onClick={handleInput}
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