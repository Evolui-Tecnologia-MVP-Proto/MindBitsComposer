import React from 'react';
import { Background, BackgroundVariant } from 'reactflow';

interface FlowGridProps {
  isDark: boolean;
}

export const FlowGrid: React.FC<FlowGridProps> = ({ isDark }) => {
  const documentIsDark = document.documentElement.classList.contains('dark');
  const gridColor = documentIsDark ? "#ffffff" : "#000000";
  
  // Force re-render by using theme as key
  return (
    <Background 
      key={documentIsDark ? 'dark' : 'light'}
      gap={16}
      size={1}
      color={gridColor}
      variant={BackgroundVariant.Dots}
    />
  );
};