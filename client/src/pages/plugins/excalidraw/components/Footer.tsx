import React from "react";

export const Footer: React.FC = () => {
  return (
    <div className="footer">
      <div className="footer__left">
        <span>Made with ❤️ by Excalidraw</span>
      </div>
      <div className="footer__right">
        <a 
          href="https://github.com/excalidraw/excalidraw" 
          target="_blank" 
          rel="noopener noreferrer"
          className="footer__link"
        >
          GitHub
        </a>
        <a 
          href="https://excalidraw.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="footer__link"
        >
          excalidraw.com
        </a>
      </div>
    </div>
  );
};