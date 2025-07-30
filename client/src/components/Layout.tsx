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
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-[#111827] shadow-sm z-10 w-full flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-0 mx-0">
          <div className="flex justify-between h-16 w-full">
            <div className="flex items-center pl-5" style={{ marginLeft: 0 }}>
              <div className="flex items-center">
                <Logo />
                <h1 className="text-xl font-semibold text-gray-800 dark:text-[#6B7280]">
                  EVO-MindBits Composer
                </h1>
              </div>
            </div>
            
            <div className="flex items-center pr-10">
              <AvatarMenu />
            </div>
          </div>
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        <Sidebar 
          isMobileOpen={isMobileMenuOpen} 
          setIsMobileOpen={setIsMobileMenuOpen} 
        />
        
        <main className="flex-1 relative z-0 focus:outline-none bg-gray-50 dark:bg-[#1F2937] p-5 min-h-0 overflow-auto pl-[10px] pr-[10px] flex flex-col">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
