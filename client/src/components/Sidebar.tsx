import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Settings, FileText, Edit, GitBranch, File, Cog, Puzzle, Home, PenTool, Network, Database, FlaskConical } from "lucide-react";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";

type SidebarProps = {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
};

export default function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const [location] = useLocation();
  const [activeItem, setActiveItem] = useState("");
  const { checkAndNavigate } = useNavigationGuard();

  useEffect(() => {
    if (location === "/" || location.startsWith("/home")) {
      setActiveItem("home");
    } else if (location.startsWith("/admin")) {
      setActiveItem("admin");
    } else if (location.startsWith("/templates")) {
      setActiveItem("templates");
    } else if (location.startsWith("/cadastros-gerais")) {
      setActiveItem("cadastros-gerais");
    } else if (location.startsWith("/lexical")) {
      setActiveItem("lexical");
    } else if (location.startsWith("/fluxos")) {
      setActiveItem("fluxos");
    } else if (location.startsWith("/documentos-embed")) {
      setActiveItem("documentos-embed");
    } else if (location.startsWith("/documentos-refact")) {
      setActiveItem("documentos-refact");
    } else if (location.startsWith("/documentos")) {
      setActiveItem("documentos");
    } else if (location.startsWith("/plugins")) {
      setActiveItem("plugins");
    } else if (location.startsWith("/configuracoes")) {
      setActiveItem("configuracoes");
    } else {
      setActiveItem("");
    }
  }, [location]);

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  const handleNavigation = (path: string) => {
    checkAndNavigate(path);
    closeMobileMenu();
  };

  return (
    <>
      <aside 
        className={`sidebar ${isMobileOpen ? "translate-x-0" : ""}`}
      >
        <nav className="mt-5 px-2 space-y-1">
          <div className="sidebar-item-container">
            <div 
              className={`sidebar-item ${activeItem === "home" ? "sidebar-active" : ""}`}
              onClick={() => handleNavigation("/")}
            >
              <Home className="mr-3 h-6 w-6" />
              Principal
            </div>
          </div>
          
          <div className="sidebar-item-container">
            <div 
              className={`sidebar-item ${activeItem === "lexical" ? "sidebar-active" : ""}`}
              onClick={() => handleNavigation("/lexical")}
            >
              <PenTool className="mr-3 h-6 w-6" />
              Composer
            </div>
          </div>
          
          <div className="sidebar-item-container">
            <div 
              className={`sidebar-item ${activeItem === "fluxos" ? "sidebar-active" : ""}`}
              onClick={() => handleNavigation("/fluxos")}
            >
              <Network className="mr-3 h-6 w-6" />
              Fluxos
            </div>
          </div>
          
          <div className="sidebar-item-container">
            <div 
              className={`sidebar-item ${activeItem === "documentos" ? "sidebar-active" : ""}`}
              onClick={() => handleNavigation("/documentos")}
            >
              <File className="mr-3 h-6 w-6" />
              Documentos
            </div>
          </div>
          
          <div className="sidebar-item-container">
            <div 
              className={`sidebar-item ${activeItem === "templates" ? "sidebar-active" : ""}`}
              onClick={() => handleNavigation("/templates")}
            >
              <FileText className="mr-3 h-6 w-6" />
              Templates
            </div>
          </div>
          
          <div className="sidebar-item-container">
            <div 
              className={`sidebar-item ${activeItem === "cadastros-gerais" ? "sidebar-active" : ""}`}
              onClick={() => handleNavigation("/cadastros-gerais")}
            >
              <Database className="mr-3 h-6 w-6" />
              Cadastros Gerais
            </div>
          </div>
          
          <div className="sidebar-item-container">
            <div 
              className={`sidebar-item ${activeItem === "plugins" ? "sidebar-active" : ""}`}
              onClick={() => handleNavigation("/plugins")}
            >
              <Puzzle className="mr-3 h-6 w-6" />
              Plugins
            </div>
          </div>

          <div className="sidebar-item-container">
            <div 
              className={`sidebar-item ${activeItem === "admin" ? "sidebar-active" : ""}`}
              onClick={() => handleNavigation("/admin")}
            >
              <Settings className="mr-3 h-6 w-6" />
              Administração
            </div>
          </div>



        </nav>
      </aside>

      {/* Overlay for mobile */}
      <div 
        className={`sidebar-overlay ${isMobileOpen ? "block" : "hidden"}`} 
        onClick={() => setIsMobileOpen(false)}
      />
    </>
  );
}
