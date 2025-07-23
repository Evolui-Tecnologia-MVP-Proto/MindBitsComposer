import React, { useState, useEffect } from 'react';
import { Background, BackgroundVariant } from 'reactflow';

interface FlowGridProps {
  isDark: boolean;
}

export const FlowGrid: React.FC<FlowGridProps> = ({ isDark }) => {
  const [currentTheme, setCurrentTheme] = useState(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  
  useEffect(() => {
    const checkTheme = () => {
      const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      if (newTheme !== currentTheme) {
        setCurrentTheme(newTheme);
      }
    };
    
    // Check immediately
    checkTheme();
    
    // Watch for class changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, [currentTheme]);
  
  const gridColor = currentTheme === 'dark' ? "#ffffff" : "#000000";
  
  return (
    <Background 
      key={`${currentTheme}-${gridColor}`}
      gap={16}
      size={1}
      color={gridColor}
      variant={BackgroundVariant.Dots}
    />
  );
};