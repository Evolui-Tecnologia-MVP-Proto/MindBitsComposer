import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const StartNode = ({ data }: NodeProps) => {
  return (
    <div className="px-4 py-2 rounded-full bg-blue-100 border-2 border-blue-500 text-blue-700 shadow-md min-w-[100px] text-center">
      <div className="font-medium">{data.label}</div>
      
      {/* Apenas handle de saída */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-blue-500"
      />
    </div>
  );
};

export default memo(StartNode);