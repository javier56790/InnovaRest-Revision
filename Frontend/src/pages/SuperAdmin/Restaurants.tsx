import { useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import EmptyState from "../../components/superAdmin/EmptyState";
import PageHeading from "../../components/superAdmin/PageHeading";
import {
  initialPlatformRestaurants,
  type RestaurantPlatformStatus,
} from "../../data/superAdminPreviewData";
import { PageIcon } from "../../icons";

type StatusFilter = "TODOS" | RestaurantPlatformStatus;

export default function Restaurants() {
  const [restaurants, setRestaurants] = useState(initialPlatformRestaurants);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("TODOS");

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return restaurants.filter((restaurant) => {
      const matchesQuery =
        !normalizedQuery ||
        restaurant.name.toLowerCase().includes(normalizedQuery) ||
        restaurant.administratorName.toLowerCase().includes(normalizedQuery) ||
        restaurant.location.toLowerCase().includes(normalizedQuery);
      const matchesStatus = status === "TODOS" || restaurant.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [query, restaurants, status]);

  const toggleRestaurant = (id: string) => {
    setRestaurants((current) =>
      current.map((restaurant) =>
        restaurant.id === id
          ? { ...restaurant, status: restaurant.status === "ACTIVO" ? "INACTIVO" : "ACTIVO" }
          : restaurant,
      ),
    );
  };

  return (
    <>
      <PageMeta title="Restaurantes | Superadmin InnovaRest" description="Gestión global de restaurantes." />
      <div className="space-y-6">
        <PageHeading
          title="Restaurantes"
          description="Consulta los establecimientos registrados y administra su acceso a la plataforma."
        />

        <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="grid gap-3 border-b border-gray-100 p-5 dark:border-gray-800 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-6">
            <label>
              <span className="sr-only">Buscar restaurante</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por restaurante, administrador o ubicación"
                className="admin-input"
              />
            </label>
            <label>
              <span className="sr-only">Filtrar por estado</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="admin-input">
                <option value="TODOS">Todos los estados</option>
                <option value="ACTIVO">Activos</option>
                <option value="INACTIVO">Inactivos</option>
              </select>
            </label>
          </div>

          {filteredRestaurants.length === 0 ? (
            <EmptyState
              icon={<PageIcon className="size-7" />}
              title="No hay restaurantes para mostrar"
              description="La tabla está lista para recibir nombre, administrador, categoría, ubicación y estado desde la base de datos."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-4">Restaurante</th>
                    <th className="px-6 py-4">Administrador</th>
                    <th className="px-6 py-4">Categoría</th>
                    <th className="px-6 py-4">Ubicación</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredRestaurants.map((restaurant) => (
                    <tr key={restaurant.id} className="text-sm text-gray-600 dark:text-gray-300">
                      <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white/90">{restaurant.name}</td>
                      <td className="px-6 py-4">{restaurant.administratorName}</td>
                      <td className="px-6 py-4">{restaurant.category}</td>
                      <td className="px-6 py-4">{restaurant.location}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${restaurant.status === "ACTIVO" ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
                          {restaurant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleRestaurant(restaurant.id)}
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${restaurant.status === "ACTIVO" ? "border-error-200 text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:hover:bg-error-500/10" : "border-success-200 text-success-700 hover:bg-success-50 dark:border-success-500/30 dark:text-success-400 dark:hover:bg-success-500/10"}`}
                        >
                          {restaurant.status === "ACTIVO" ? "Desactivar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
