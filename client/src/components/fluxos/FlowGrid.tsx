import React from 'react';
import { Background, BackgroundVariant } from 'reactflow';

interface FlowGridProps {
  isDark: boolean;
}

export const FlowGrid: React.FC<FlowGridProps> = ({ isDark }) => {
  // Multiple checks for theme detection
  const documentIsDark = document.documentElement.classList.contains('dark');
  const htmlClasses = document.documentElement.className;
  const bodyClasses = document.body.className;
  
  console.log('🔍 COMPLETE THEME DEBUG:');
  console.log('  - isDark prop:', isDark);
  console.log('  - documentIsDark:', documentIsDark);
  console.log('  - html classes:', htmlClasses);
  console.log('  - body classes:', bodyClasses);
  console.log('  - localStorage theme:', localStorage.getItem('theme'));
  
  const gridColor = documentIsDark ? "#ffffff" : "#ff0000";
  console.log('  - final gridColor:', gridColor);
  
  return (
    <Background 
      gap={20}
      size={2}
      color={gridColor}
      variant={BackgroundVariant.Dots}
    />
  );
};