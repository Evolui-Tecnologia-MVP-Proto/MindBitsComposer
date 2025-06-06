import React from 'react';
import { Handle, Position } from 'reactflow';
import { Zap } from 'lucide-react';

interface ActionNodeProps {
  data: {
    label?: string;
    [key: string]: any;
  };
  isConnectable?: boolean;
}

export function ActionNodeComponent({ data, isConnectable }: ActionNodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-blue-100 border-2 border-blue-500 min-w-[120px]">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-blue-600" />
        <div className="font-bold text-blue-700">
          {data.label || 'Ação'}
        </div>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        id="action-input"
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-blue-500"
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="action-output"
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-blue-500"
      />
    </div>
  );
}