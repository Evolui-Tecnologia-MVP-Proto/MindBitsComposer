import React from 'react';
import { Background, BackgroundVariant } from 'reactflow';

interface FlowGridProps {
  isDark: boolean;
}

export const FlowGrid: React.FC<FlowGridProps> = ({ isDark }) => {
  // Use document class for reliable theme detection
  const documentIsDark = document.documentElement.classList.contains('dark');
  const gridColor = documentIsDark ? "#ffffff" : "#000000";
  
  console.log('🔧 Final test - documentIsDark:', documentIsDark, 'gridColor:', gridColor);
  
  return (
    <Background 
      gap={20}
      size={2}
      color={gridColor}
      variant={BackgroundVariant.Dots}
    />
  );
};