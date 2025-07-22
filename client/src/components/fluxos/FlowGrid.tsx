import React from 'react';
import { Background, BackgroundVariant } from 'reactflow';

interface FlowGridProps {
  isDark: boolean;
}

export const FlowGrid: React.FC<FlowGridProps> = ({ isDark }) => {
  console.log('🔍 FlowGrid - isDark:', isDark, 'color will be:', isDark ? "#ffffff" : "#000000");
  
  return (
    <Background 
      gap={16}
      size={1}
      color={isDark ? "#ffffff" : "#000000"}
      variant={BackgroundVariant.Dots}
    />
  );
};