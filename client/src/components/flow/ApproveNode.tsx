import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const ApproveNode = ({ data }: NodeProps) => {
  return (
    <div className="px-4 py-2 rounded-lg bg-indigo-100 border-2 border-indigo-500 text-indigo-700 shadow-md min-w-[120px] text-center">
      <div className="font-medium">{data.label}</div>
      
      {/* Handle de entrada e saída */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-indigo-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-indigo-500"
      />
    </div>
  );
};

export default memo(ApproveNode);