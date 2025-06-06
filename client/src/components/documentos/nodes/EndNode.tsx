import React from 'react';
import { Handle, Position } from 'reactflow';
import { Square } from 'lucide-react';

interface EndNodeProps {
  data: {
    label?: string;
    [key: string]: any;
  };
  isConnectable?: boolean;
}

export function EndNodeComponent({ data, isConnectable }: EndNodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-red-100 border-2 border-red-500 min-w-[120px]">
      <div className="flex items-center gap-2">
        <Square className="w-4 h-4 text-red-600" />
        <div className="font-bold text-red-700">
          {data.label || 'Fim'}
        </div>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        id="end-input"
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-red-500"
      />
    </div>
  );
}