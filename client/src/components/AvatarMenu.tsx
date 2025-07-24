import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon, User, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import UserProfileModal from "./UserProfileModal";

export default function AvatarMenu() {
  const { user, logoutMutation } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
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
    setIsProfileModalOpen(true);
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
        <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-lg shadow-lg bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-600 focus:outline-none z-50">
          {/* Cabeçalho com informações do usuário */}
          <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {user?.name || "PIVolf"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {user?.email || "pivolf@evolutecnologia.com.br"}
            </div>
          </div>
          
          {/* Menu items */}
          <div className="py-1" role="none">
            <button
              onClick={handlePreferences}
              className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-[#1F2937] transition-colors"
            >
              <User className="h-4 w-4 mr-3 text-gray-500 dark:text-gray-300" />
              Perfil
            </button>
            
            <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-[#1F2937] transition-colors">
              <div className="flex items-center">
                <Moon className="h-4 w-4 mr-3 text-gray-500 dark:text-gray-300" />
                Modo escuro
              </div>
              <Switch
                checked={isDark}
                onCheckedChange={toggleTheme}
                aria-label="Alternar tema"
              />
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-[#1F2937] transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3 text-gray-500 dark:text-gray-300" />
              Sair
            </button>
          </div>
        </div>
      )}

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}
