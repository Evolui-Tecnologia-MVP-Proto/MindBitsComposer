import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Settings, FileText } from "lucide-react";

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
          <Link href="/admin">
            <a 
              className={`sidebar-item ${activeItem === "admin" ? "sidebar-active" : ""}`}
              onClick={closeMobileMenu}
            >
              <Settings className="mr-3 h-6 w-6" />
              Administração
            </a>
          </Link>
          
          <Link href="/templates">
            <a 
              className={`sidebar-item ${activeItem === "templates" ? "sidebar-active" : ""}`}
              onClick={closeMobileMenu}
            >
              <FileText className="mr-3 h-6 w-6" />
              Templates
            </a>
          </Link>
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
