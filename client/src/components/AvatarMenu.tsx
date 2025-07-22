import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon } from "lucide-react";
import { useLocation } from "wouter";

export default function AvatarMenu() {
  const { user, logoutMutation } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handlePreferences = () => {
    setIsOpen(false);
    navigate("/preferences");
  };

  const handleLogout = () => {
    setIsOpen(false);
    logoutMutation.mutate();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center space-x-3 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Avatar className="h-9 w-9">
          <AvatarImage src={user?.avatarUrl || ""} alt={user?.name || ""} />
          <AvatarFallback className="bg-primary text-white">
            {user?.name ? getInitials(user.name) : "U"}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
          {user?.name?.split(' ')[0]}
        </span>
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-[#1F2937] ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-gray-700 focus:outline-none z-50">
          {/* Seção do Tema */}
          <div className="py-2" role="none">
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center space-x-2">
                {isDark ? (
                  <Moon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <Sun className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-100">
                  {isDark ? "Modo Escuro" : "Modo Claro"}
                </span>
              </div>
              <Switch
                checked={isDark}
                onCheckedChange={toggleTheme}
                aria-label="Alternar tema"
              />
            </div>
          </div>
          
          {/* Seção de Navegação */}
          <div className="py-1" role="none">
            <button
              onClick={handlePreferences}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Preferências
            </button>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
