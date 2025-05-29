import { getCurrentYear } from "@/lib/utils";

export default function Footer() {
  const currentYear = getCurrentYear();
  
  return (
    <footer className="bg-white border-t border-gray-200 flex-shrink-0">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-500">
          &copy; {currentYear} EVO-MindBits Composer. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
