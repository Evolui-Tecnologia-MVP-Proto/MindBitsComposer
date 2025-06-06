import React from 'react';
import { Handle, Position } from 'reactflow';
import { Link } from 'lucide-react';

interface IntegrationNodeProps {
  data: {
    label?: string;
    [key: string]: any;
  };
  isConnectable?: boolean;
}

export function IntegrationNodeComponent({ data, isConnectable }: IntegrationNodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-purple-100 border-2 border-purple-500 min-w-[120px]">
      <div className="flex items-center gap-2">
        <Link className="w-4 h-4 text-purple-600" />
        <div className="font-bold text-purple-700">
          {data.label || 'Integração'}
        </div>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        id="integration-input"
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-purple-500"
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="integration-output"
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-purple-500"
      />
    </div>
  );
}