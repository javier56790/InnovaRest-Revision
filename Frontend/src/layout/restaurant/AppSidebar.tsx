import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router";
import { useSidebar } from "../../context/SidebarContext";
import { useAuth } from "../../context/AuthContext";
import {
  CalenderIcon,
  GridIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../../icons";

type NavItem = {
  name: string;
  path: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  { name: "Inicio", path: "/panel-restaurante", icon: <GridIcon /> },
  { name: "Reservas", path: "/panel-restaurante/reservas", icon: <CalenderIcon /> },
  { name: "Mesas", path: "/panel-restaurante/mesas", icon: <TableIcon /> },
  { name: "Perfil del restaurante", path: "/panel-restaurante/perfil", icon: <UserCircleIcon /> },
  { name: "Estadísticas", path: "/panel-restaurante/estadisticas", icon: <PieChartIcon /> },
];

export default function AppSidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth() as { logout: () => void };
  const {
    isExpanded,
    isMobileOpen,
    isHovered,
    setIsHovered,
    toggleMobileSidebar,
  } = useSidebar();
  const showLabels = isExpanded || isHovered || isMobileOpen;

  const closeMobileMenu = () => {
    if (isMobileOpen) toggleMobileSidebar();
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 ${
        showLabels ? "w-[290px]" : "w-[90px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex min-h-24 items-center ${showLabels ? "justify-start" : "justify-center"}`}>
        <NavLink to="/panel-restaurante" onClick={closeMobileMenu} aria-label="Ir al inicio">
          {showLabels ? (
            <div className="rounded-xl bg-white px-2 py-1">
              <img
                src="/images/innovarest-logo.png"
                alt="InnovaRest"
                className="h-14 w-44 object-contain object-left"
              />
            </div>
          ) : (
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white shadow-theme-sm">
              IR
            </span>
          )}
        </NavLink>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 no-scrollbar">
        <div className="mt-3">
          {showLabels ? (
            <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Operación
            </p>
          ) : (
            <div className="mx-auto mb-4 h-px w-8 bg-gray-200 dark:bg-gray-800" />
          )}

          <nav aria-label="Navegación principal">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === "/panel-restaurante"}
                    onClick={closeMobileMenu}
                    title={!showLabels ? item.name : undefined}
                    className={({ isActive }) =>
                      `group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        showLabels ? "justify-start" : "justify-center"
                      } ${
                        isActive
                          ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                      }`
                    }
                  >
                    <span className="menu-item-icon-size shrink-0">{item.icon}</span>
                    {showLabels && <span>{item.name}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-auto pt-8">
          {showLabels && (
            <div className="mb-4 rounded-2xl bg-gray-900 p-4 text-white dark:bg-gray-800">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">
                InnovaRest
              </p>
              <p className="mt-2 text-sm font-semibold">Panel del restaurante</p>
              <p className="mt-1 text-xs leading-5 text-white/55">
                Control de reservas y disponibilidad.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            title={!showLabels ? "Cerrar sesión" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/10 dark:hover:text-error-400 ${
              showLabels ? "justify-start" : "justify-center"
            }`}
          >
            <PlugInIcon className="size-6 shrink-0" />
            {showLabels && <span>Cerrar sesión</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
