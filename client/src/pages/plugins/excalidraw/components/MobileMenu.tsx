import React from "react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="mobile-menu" onClick={onClose}>
      <div className="mobile-menu__content" onClick={(e) => e.stopPropagation()}>
        <button className="mobile-menu__close" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
};