import { getCurrentYear } from "@/lib/utils";

export default function Footer() {
  const currentYear = getCurrentYear();
  
  return (
    <footer className="border-t border-gray-200 dark:border-gray-700" style={{ backgroundColor: "#111827" }}>
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm" style={{ color: "#9ca3af" }}>
          &copy; {currentYear} EVO-MindBits Composer. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
