import { useState, useEffect } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Verifica se há tema salvo no localStorage
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    
    // Se não há tema salvo, verifica a preferência do sistema
    if (!savedTheme) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    
    return savedTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove ambas as classes primeiro
    root.classList.remove("light", "dark");
    
    // Adiciona a classe do tema atual
    root.classList.add(theme);
    
    // Salva no localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === "light" ? "dark" : "light");
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === "dark",
    isLight: theme === "light"
  };
}