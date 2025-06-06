import React from 'react';
import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';

interface SwitchNodeProps {
  data: {
    label?: string;
    [key: string]: any;
  };
  isConnectable?: boolean;
}

export function SwitchNodeComponent({ data, isConnectable }: SwitchNodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-orange-100 border-2 border-orange-500 min-w-[120px]">
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-orange-600" />
        <div className="font-bold text-orange-700">
          {data.label || 'Switch'}
        </div>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        id="switch-input"
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-orange-500"
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="switch-output-true"
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-orange-500"
        style={{ top: '25%' }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="switch-output-false"
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-orange-500"
        style={{ top: '75%' }}
      />
    </div>
  );
}