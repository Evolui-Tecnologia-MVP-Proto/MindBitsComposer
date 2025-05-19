import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const EndNode = ({ data }: NodeProps) => {
  return (
    <div className="px-4 py-2 rounded-full bg-slate-100 border-2 border-slate-500 text-slate-700 shadow-md min-w-[100px] text-center">
      <div className="font-medium">{data.label}</div>
      
      {/* Apenas handle de entrada */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-slate-500"
      />
    </div>
  );
};

export default memo(EndNode);