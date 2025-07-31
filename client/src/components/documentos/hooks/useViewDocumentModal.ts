import { useState } from "react";
import { type Documento } from "@shared/schema";

export function useViewDocumentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(null);

  const openModal = (documento: Documento) => {
    setSelectedDocument(documento);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedDocument(null);
  };

  return {
    isOpen,
    selectedDocument,
    openModal,
    closeModal,
  };
}