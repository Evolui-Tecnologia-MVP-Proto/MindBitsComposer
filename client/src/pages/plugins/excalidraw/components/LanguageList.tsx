import React from "react";

interface Language {
  code: string;
  label: string;
}

interface LanguageListProps {
  languages: Language[];
  currentLanguage: string;
  onLanguageSelect: (code: string) => void;
  isOpen: boolean;
}

export const LanguageList: React.FC<LanguageListProps> = ({
  languages,
  currentLanguage,
  onLanguageSelect,
  isOpen,
}) => {
  if (!isOpen) return null;

  return (
    <div className="language-list">
      {languages.map((language) => (
        <div
          key={language.code}
          className={`language-list__item ${
            currentLanguage === language.code ? "language-list__item--selected" : ""
          }`}
          onClick={() => onLanguageSelect(language.code)}
        >
          {language.label}
        </div>
      ))}
    </div>
  );
};