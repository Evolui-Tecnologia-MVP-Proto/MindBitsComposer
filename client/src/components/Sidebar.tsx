import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Settings, FileText, Edit } from "lucide-react";

type SidebarProps = {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
};

export default function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const [location] = useLocation();
  const [activeItem, setActiveItem] = useState("");

  useEffect(() => {
    if (location.startsWith("/admin")) {
      setActiveItem("admin");
    } else if (location.startsWith("/templates")) {
      setActiveItem("templates");
    } else if (location.startsWith("/editor")) {
      setActiveItem("editor");
    } else {
      setActiveItem("");
    }
  }, [location]);

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  return (
    <>
      <aside 
        className={`sidebar ${isMobileOpen ? "translate-x-0" : ""}`}
      >
        <nav className="mt-5 px-2 space-y-1">
          <div className="sidebar-item-container">
            <Link href="/admin">
              <div 
                className={`sidebar-item ${activeItem === "admin" ? "sidebar-active" : ""}`}
                onClick={closeMobileMenu}
              >
                <Settings className="mr-3 h-6 w-6" />
                Administração
              </div>
            </Link>
          </div>
          
          <div className="sidebar-item-container">
            <Link href="/templates">
              <div 
                className={`sidebar-item ${activeItem === "templates" ? "sidebar-active" : ""}`}
                onClick={closeMobileMenu}
              >
                <FileText className="mr-3 h-6 w-6" />
                Templates
              </div>
            </Link>
          </div>
          
          <div className="sidebar-item-container">
            <Link href="/editor">
              <div 
                className={`sidebar-item ${activeItem === "editor" ? "sidebar-active" : ""}`}
                onClick={closeMobileMenu}
              >
                <Edit className="mr-3 h-6 w-6" />
                Editor
              </div>
            </Link>
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
