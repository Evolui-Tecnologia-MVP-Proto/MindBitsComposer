import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Settings, FileText, Edit, GitBranch, File, Cog, Puzzle, Home, PenTool, Network, Database, FlaskConical } from "lucide-react";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { useAuth } from "@/hooks/use-auth";
import { checkMenuAccess, getAccessStyles } from "@/lib/accessControl";

type SidebarProps = {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
};

export default function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const [location] = useLocation();
  const [activeItem, setActiveItem] = useState("");
  const { checkAndNavigate } = useNavigationGuard();
  const { user } = useAuth();

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
          {/* Menu 1 - Principal (Home) */}
          {(() => {
            const accessType = checkMenuAccess(user?.userRole, 'menu1');
            const styles = getAccessStyles(accessType);
            if (styles.hidden) return null;
            return (
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeItem === "home" ? "sidebar-active" : ""} ${styles.className || ''}`}
                  onClick={styles.disabled ? styles.onClick : () => handleNavigation("/")}
                >
                  <Home className="mr-3 h-6 w-6" />
                  Principal
                </div>
              </div>
            );
          })()}
          
          {/* Menu 2 - Composer */}
          {(() => {
            const accessType = checkMenuAccess(user?.userRole, 'menu2');
            const styles = getAccessStyles(accessType);
            if (styles.hidden) return null;
            return (
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeItem === "lexical" ? "sidebar-active" : ""} ${styles.className || ''}`}
                  onClick={styles.disabled ? styles.onClick : () => handleNavigation("/lexical")}
                >
                  <PenTool className="mr-3 h-6 w-6" />
                  Composer
                </div>
              </div>
            );
          })()}
          
          {/* Menu 3 - Fluxos */}
          {(() => {
            const accessType = checkMenuAccess(user?.userRole, 'menu3');
            const styles = getAccessStyles(accessType);
            if (styles.hidden) return null;
            return (
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeItem === "fluxos" ? "sidebar-active" : ""} ${styles.className || ''}`}
                  onClick={styles.disabled ? styles.onClick : () => handleNavigation("/fluxos")}
                >
                  <Network className="mr-3 h-6 w-6" />
                  Fluxos
                </div>
              </div>
            );
          })()}
          
          {/* Menu 4 - Documentos */}
          {(() => {
            const accessType = checkMenuAccess(user?.userRole, 'menu4');
            const styles = getAccessStyles(accessType);
            if (styles.hidden) return null;
            return (
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeItem === "documentos" ? "sidebar-active" : ""} ${styles.className || ''}`}
                  onClick={styles.disabled ? styles.onClick : () => handleNavigation("/documentos")}
                >
                  <File className="mr-3 h-6 w-6" />
                  Documentos
                </div>
              </div>
            );
          })()}
          
          {/* Menu 5 - Templates */}
          {(() => {
            const accessType = checkMenuAccess(user?.userRole, 'menu5');
            const styles = getAccessStyles(accessType);
            if (styles.hidden) return null;
            return (
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeItem === "templates" ? "sidebar-active" : ""} ${styles.className || ''}`}
                  onClick={styles.disabled ? styles.onClick : () => handleNavigation("/templates")}
                >
                  <FileText className="mr-3 h-6 w-6" />
                  Templates
                </div>
              </div>
            );
          })()}
          
          {/* Menu 6 - Cadastros Gerais */}
          {(() => {
            const accessType = checkMenuAccess(user?.userRole, 'menu6');
            const styles = getAccessStyles(accessType);
            if (styles.hidden) return null;
            return (
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeItem === "cadastros-gerais" ? "sidebar-active" : ""} ${styles.className || ''}`}
                  onClick={styles.disabled ? styles.onClick : () => handleNavigation("/cadastros-gerais")}
                >
                  <Database className="mr-3 h-6 w-6" />
                  Cadastros Gerais
                </div>
              </div>
            );
          })()}
          
          {/* Menu 7 - Plugins */}
          {(() => {
            const accessType = checkMenuAccess(user?.userRole, 'menu7');
            const styles = getAccessStyles(accessType);
            if (styles.hidden) return null;
            return (
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeItem === "plugins" ? "sidebar-active" : ""} ${styles.className || ''}`}
                  onClick={styles.disabled ? styles.onClick : () => handleNavigation("/plugins")}
                >
                  <Puzzle className="mr-3 h-6 w-6" />
                  Plugins
                </div>
              </div>
            );
          })()}

          {/* Menu 8 - Administração */}
          {(() => {
            const accessType = checkMenuAccess(user?.userRole, 'menu8');
            const styles = getAccessStyles(accessType);
            if (styles.hidden) return null;
            return (
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeItem === "admin" ? "sidebar-active" : ""} ${styles.className || ''}`}
                  onClick={styles.disabled ? styles.onClick : () => handleNavigation("/admin")}
                >
                  <Settings className="mr-3 h-6 w-6" />
                  Administração
                </div>
              </div>
            );
          })()}



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
