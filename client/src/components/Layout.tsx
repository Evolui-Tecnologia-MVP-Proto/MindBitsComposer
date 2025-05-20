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
      <header className="bg-white shadow-sm z-10 w-full">
        <div className="w-full px-0 mx-0">
          <div className="flex justify-between h-16 w-full">
            <div className="flex items-center pl-1" style={{ marginLeft: 0 }}>
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
