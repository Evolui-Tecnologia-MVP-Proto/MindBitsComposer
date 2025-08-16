import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Code, GitCompare } from 'lucide-react';

type ViewMode = 'mdx' | 'raw' | 'diff';

interface DocumentMdModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}

function RawTextView({ content }: { content: string }) {
  const lines = content.split('\n');
  
  return (
    <div className="text-gray-100 dark:text-gray-300 p-4 rounded-lg font-mono text-sm overflow-x-auto bg-[#1B2028]">
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

export default function DocumentMdModal({ isOpen, onClose, document }: DocumentMdModalProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('mdx');

  if (!document) {
    return null;
  }

  const currentContent = showOriginal ? document.md_file_old : document.md_file;
  const hasOriginal = document.md_file_old && document.md_file_old.trim() !== '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {document.titulo || 'Documento'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto border-t border-gray-200 dark:border-[#111827] mt-4 p-6 bg-slate-100 dark:bg-[#020203]">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-[#111827] rounded-lg shadow-sm border border-gray-200 dark:border-[#111827] p-6">
              <RawTextView content={currentContent || ''} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}