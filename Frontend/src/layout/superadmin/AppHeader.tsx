import { Link, useLocation } from "react-router";
import { ThemeToggleButton } from "../../components/common/ThemeToggleButton";
import { useSidebar } from "../../context/SidebarContext";

const pageTitles: Record<string, string> = {
  "/superadmin": "Resumen global",
  "/superadmin/restaurantes": "Gestión de restaurantes",
  "/superadmin/usuarios": "Gestión de usuarios",
  "/superadmin/reservas": "Reservas globales",
  "/superadmin/perfil": "Mi perfil",
};

export default function AppHeader() {
  const location = useLocation();
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) toggleSidebar();
    else toggleMobileSidebar();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/90 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/90">
      <div className="flex min-h-18 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={handleToggle}
            aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            {isMobileOpen ? (
              <span className="text-xl leading-none">×</span>
            ) : (
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
                <path d="M1 1H17M1 7H12M1 13H17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            )}
          </button>

          <Link to="/superadmin" className="lg:hidden">
            <img src="/images/innovarest-logo.png" alt="InnovaRest" className="h-11 w-32 object-contain object-left" />
          </Link>

          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
              {pageTitles[location.pathname] ?? "Superadmin InnovaRest"}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Administración global</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 md:inline-flex">
            Acceso global
          </span>
          <ThemeToggleButton />
          <div className="hidden items-center gap-3 rounded-full border border-gray-200 bg-white py-1.5 pl-1.5 pr-4 dark:border-gray-800 dark:bg-gray-900 sm:flex">
            <span className="flex size-9 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">SA</span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Superadmin</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">InnovaRest</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
