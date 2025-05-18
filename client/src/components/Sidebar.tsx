import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Settings } from "lucide-react";

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
    } else {
      // Could add more matches here for other menu items
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
          {/* Espaço para futuros itens de menu */}
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
