import React from 'react';
import { Background, BackgroundVariant } from 'reactflow';

interface FlowGridProps {
  isDark: boolean;
}

export const FlowGrid: React.FC<FlowGridProps> = ({ isDark }) => {
  console.log('🟣 FlowGrid rendering - isDark:', isDark);
  
  return (
    <Background 
      gap={16}
      size={1}
      color={isDark ? "#ffffff" : "#cccccc"}
      variant={BackgroundVariant.Dots}
    />
  );
};