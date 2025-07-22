import React from 'react';
import { Background, BackgroundVariant } from 'reactflow';

interface FlowGridProps {
  isDark: boolean;
}

export const FlowGrid: React.FC<FlowGridProps> = ({ isDark }) => {
  console.log('🟣 FlowGrid rendering - isDark:', isDark);
  
  return (
    <>
      <Background 
        gap={20}
        size={2}
        color="#ff0000"
        variant={BackgroundVariant.Dots}
      />
      <Background 
        gap={100}
        size={1}
        color="#00ff00" 
        variant={BackgroundVariant.Lines}
      />
    </>
  );
};