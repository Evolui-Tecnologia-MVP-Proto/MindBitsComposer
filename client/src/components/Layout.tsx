import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import AvatarMenu from "./AvatarMenu";
import Footer from "./Footer";
import Logo from "./ui/logo";
import { useAuth } from "@/hooks/use-auth";

type LayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                className="p-2 rounded-md lg:hidden"
                onClick={toggleMobileMenu}
                aria-label="Abrir menu"
              >
                <Menu className="h-6 w-6 text-gray-700" />
              </button>
              <div className="flex items-center">
                <Logo />
                <h1 className="text-xl font-semibold text-gray-800">
                  EVO-MindBits Composer
                </h1>
              </div>
            </div>
            
            <div className="flex items-center">
              <AvatarMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isMobileOpen={isMobileMenuOpen} 
          setIsMobileOpen={setIsMobileMenuOpen} 
        />
        
        <main className="flex-1 relative z-0 overflow-hidden focus:outline-none bg-gray-50 p-0">
          {children}
        </main>
      </div>

      <Footer />
    </div>
  );
}
