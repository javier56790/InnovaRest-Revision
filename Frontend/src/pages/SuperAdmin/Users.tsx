import { useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import EmptyState from "../../components/superAdmin/EmptyState";
import PageHeading from "../../components/superAdmin/PageHeading";
import {
  initialPlatformUsers,
  type PlatformUserRole,
  type PlatformUserStatus,
} from "../../data/superAdminPreviewData";
import { GroupIcon } from "../../icons";

type RoleFilter = "TODOS" | PlatformUserRole;
type StatusFilter = "TODOS" | PlatformUserStatus;

export default function Users() {
  const [users, setUsers] = useState(initialPlatformUsers);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("TODOS");
  const [status, setStatus] = useState<StatusFilter>("TODOS");

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery);
      return matchesQuery && (role === "TODOS" || user.role === role) && (status === "TODOS" || user.status === status);
    });
  }, [query, role, status, users]);

  const toggleUser = (id: string) => {
    setUsers((current) =>
      current.map((user) =>
        user.id === id
          ? { ...user, status: user.status === "ACTIVO" ? "BLOQUEADO" : "ACTIVO" }
          : user,
      ),
    );
  };

  return (
    <>
      <PageMeta title="Usuarios | Superadmin InnovaRest" description="Gestión global de usuarios." />
      <div className="space-y-6">
        <PageHeading
          title="Usuarios"
          description="Consulta clientes y administradores de restaurante, filtra por rol y controla el estado de acceso."
        />

        <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="grid gap-3 border-b border-gray-100 p-5 dark:border-gray-800 md:grid-cols-[minmax(0,1fr)_190px_190px] md:p-6">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre o correo"
              className="admin-input"
              aria-label="Buscar usuario"
            />
            <select value={role} onChange={(event) => setRole(event.target.value as RoleFilter)} className="admin-input" aria-label="Filtrar por rol">
              <option value="TODOS">Todos los roles</option>
              <option value="CLIENTE">Clientes</option>
              <option value="RESTAURANTE">Administradores</option>
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="admin-input" aria-label="Filtrar por estado">
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="BLOQUEADO">Bloqueados</option>
            </select>
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={<GroupIcon className="size-7" />}
              title="No hay usuarios para mostrar"
              description="La tabla está preparada para recibir clientes y administradores desde el servicio de usuarios."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Correo</th>
                    <th className="px-6 py-4">Rol</th>
                    <th className="px-6 py-4">Registro</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="text-sm text-gray-600 dark:text-gray-300">
                      <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white/90">{user.name}</td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4">{user.role === "RESTAURANTE" ? "Administrador" : "Cliente"}</td>
                      <td className="px-6 py-4">{user.registeredAt}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.status === "ACTIVO" ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleUser(user.id)}
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${user.status === "ACTIVO" ? "border-error-200 text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:hover:bg-error-500/10" : "border-success-200 text-success-700 hover:bg-success-50 dark:border-success-500/30 dark:text-success-400 dark:hover:bg-success-500/10"}`}
                        >
                          {user.status === "ACTIVO" ? "Bloquear" : "Activar"}
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
