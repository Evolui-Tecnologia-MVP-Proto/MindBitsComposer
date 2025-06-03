import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Settings, FileText, Edit, GitBranch, File, Cog, Puzzle } from "lucide-react";
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
    if (location.startsWith("/admin")) {
      setActiveItem("admin");
    } else if (location.startsWith("/templates")) {
      setActiveItem("templates");
    } else if (location.startsWith("/editor")) {
      setActiveItem("editor");
    } else if (location.startsWith("/fluxos")) {
      setActiveItem("fluxos");
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
              className={`sidebar-item ${activeItem === "admin" ? "sidebar-active" : ""}`}
              onClick={() => handleNavigation("/admin")}
            >
              <Settings className="mr-3 h-6 w-6" />
              Administração
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
              className={`sidebar-item ${activeItem === "editor" ? "sidebar-active" : ""}`}
              onClick={() => handleNavigation("/editor")}
            >
              <Edit className="mr-3 h-6 w-6" />
              Editor
            </div>
          </div>
          
          <div className="sidebar-item-container">
            <div 
              className={`sidebar-item ${activeItem === "fluxos" ? "sidebar-active" : ""}`}
              onClick={() => handleNavigation("/fluxos")}
            >
              <GitBranch className="mr-3 h-6 w-6" />
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
              className={`sidebar-item ${activeItem === "plugins" ? "sidebar-active" : ""}`}
              onClick={() => handleNavigation("/plugins")}
            >
              <Puzzle className="mr-3 h-6 w-6" />
              Plugins
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
