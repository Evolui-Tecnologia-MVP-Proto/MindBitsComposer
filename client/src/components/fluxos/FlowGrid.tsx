import React from 'react';
import { Background, BackgroundVariant } from 'reactflow';

interface FlowGridProps {
  isDark: boolean;
}

export const FlowGrid: React.FC<FlowGridProps> = ({ isDark }) => {
  return (
    <Background 
      gap={16}
      size={1}
      color={isDark ? "#ffffff" : "#000000"}
      variant={BackgroundVariant.Dots}
    />
  );
};