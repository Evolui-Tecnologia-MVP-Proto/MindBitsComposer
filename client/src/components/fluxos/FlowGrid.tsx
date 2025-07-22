import React from 'react';
import { Background, BackgroundVariant } from 'reactflow';

interface FlowGridProps {
  isDark: boolean;
}

export const FlowGrid: React.FC<FlowGridProps> = ({ isDark }) => {
  console.log('🔍 FlowGrid - isDark:', isDark, 'document has dark class:', document.documentElement.classList.contains('dark'));
  
  // Force color based on document class to bypass any hook issues
  const documentIsDark = document.documentElement.classList.contains('dark');
  const gridColor = documentIsDark ? "#ffffff" : "#000000";
  
  console.log('🎨 Grid color will be:', gridColor);
  
  return (
    <Background 
      gap={16}
      size={1}
      color={gridColor}
      variant={BackgroundVariant.Dots}
    />
  );
};