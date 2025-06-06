import React from 'react';
import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';

interface StartNodeProps {
  data: {
    label?: string;
    [key: string]: any;
  };
  isConnectable?: boolean;
}

export function StartNodeComponent({ data, isConnectable }: StartNodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-green-100 border-2 border-green-500 min-w-[120px]">
      <div className="flex items-center gap-2">
        <Play className="w-4 h-4 text-green-600" />
        <div className="font-bold text-green-700">
          {data.label || 'Início'}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        id="start-output"
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-green-500"
      />
    </div>
  );
}