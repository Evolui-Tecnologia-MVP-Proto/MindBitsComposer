import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const DecisionNode = ({ data }: NodeProps) => {
  return (
    <div className="w-32 h-32 rotate-45 flex items-center justify-center bg-amber-100 border-2 border-amber-500 text-amber-700 shadow-md">
      <div className="font-medium text-center -rotate-45 w-full">
        {data.label}
      </div>
      
      {/* Handles nas 4 direções para decisões */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-amber-500 -rotate-45"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 bg-amber-500 -rotate-45"
        id="a"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-amber-500 -rotate-45"
        id="b"
      />
      <Handle
        type="source"
        position={Position.Left}
        className="w-2 h-2 bg-amber-500 -rotate-45"
        id="c"
      />
    </div>
  );
};

export default memo(DecisionNode);