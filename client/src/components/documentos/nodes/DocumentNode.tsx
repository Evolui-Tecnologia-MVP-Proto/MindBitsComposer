import React from 'react';
import { Handle, Position } from 'reactflow';
import { BookOpen } from 'lucide-react';

interface DocumentNodeProps {
  data: {
    label?: string;
    [key: string]: any;
  };
  isConnectable?: boolean;
}

export function DocumentNodeComponent({ data, isConnectable }: DocumentNodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-yellow-100 border-2 border-yellow-500 min-w-[120px]">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-yellow-600" />
        <div className="font-bold text-yellow-700">
          {data.label || 'Documento'}
        </div>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        id="document-input"
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-yellow-500"
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="document-output"
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-yellow-500"
      />
    </div>
  );
}