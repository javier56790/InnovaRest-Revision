import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import EmptyState from "../../components/superAdmin/EmptyState";
import PageHeading from "../../components/superAdmin/PageHeading";
import { useAuth } from "../../context/AuthContext";
import {
  formatReservationTime,
  listReservations,
  type Reservation,
  type ReservationStatus,
} from "../../services/reservations";
import { CalenderIcon } from "../../icons";

type StatusFilter = "TODOS" | ReservationStatus;

export default function GlobalReservations() {
  const { accessToken } = useAuth() as { accessToken: string | null };
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<StatusFilter>("TODOS");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    if (!accessToken) {
      setReservations([]);
      setError("La sesión no tiene un token válido.");
      setIsLoading(false);
      return () => controller.abort();
    }

    const loadGlobalReservations = async () => {
      setIsLoading(true);
      setError("");

      try {
        const data = await listReservations(accessToken, {
          signal: controller.signal,
        });
        setReservations(data);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadGlobalReservations();
    return () => controller.abort();
  }, [accessToken]);

  const filteredReservations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return reservations.filter((reservation) => {
      const matchesQuery =
        !normalizedQuery ||
        reservation.restaurantName.toLowerCase().includes(normalizedQuery) ||
        reservation.userName.toLowerCase().includes(normalizedQuery) ||
        String(reservation.id).includes(normalizedQuery);
      const matchesDate = !date || reservation.date === date;
      const matchesStatus = status === "TODOS" || reservation.status === status;
      return matchesQuery && matchesDate && matchesStatus;
    });
  }, [date, query, reservations, status]);

  const clearFilters = () => {
    setQuery("");
    setDate("");
    setStatus("TODOS");
  };

  const statusClasses = {
    CONFIRMADA: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
    CANCELADA: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
    NO_SHOW: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
  };

  return (
    <>
      <PageMeta title="Reservas globales | Superadmin InnovaRest" description="Consulta global de reservas." />
      <div className="space-y-6">
        <PageHeading
          title="Reservas globales"
          description="Consulta la actividad general por restaurante, cliente, fecha y estado sin intervenir en la operación de las mesas."
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Limpiar filtros
            </button>
          }
        />

        <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="grid gap-3 border-b border-gray-100 p-5 dark:border-gray-800 md:grid-cols-[minmax(0,1fr)_190px_210px] md:p-6">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Restaurante, cliente o código"
              className="admin-input"
              aria-label="Buscar reserva"
            />
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="admin-input"
              aria-label="Filtrar por fecha"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              className="admin-input"
              aria-label="Filtrar por estado"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="CONFIRMADA">Confirmadas</option>
              <option value="CANCELADA">Canceladas</option>
              <option value="NO_SHOW">No show</option>
            </select>
          </div>

          {isLoading ? (
            <EmptyState
              icon={<CalenderIcon className="size-7" />}
              title="Cargando reservas globales..."
              description="Estamos consultando la actividad real de la plataforma."
            />
          ) : error ? (
            <EmptyState
              icon={<CalenderIcon className="size-7" />}
              title="No fue posible cargar las reservas"
              description={error}
            />
          ) : filteredReservations.length === 0 ? (
            <EmptyState
              icon={<CalenderIcon className="size-7" />}
              title="No hay reservas para mostrar"
              description="No se encontraron reservas globales con los filtros seleccionados."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-4">Código</th>
                    <th className="px-6 py-4">Restaurante</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Fecha y hora</th>
                    <th className="px-6 py-4">Personas</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation.id} className="text-sm text-gray-600 dark:text-gray-300">
                      <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white/90">{reservation.id}</td>
                      <td className="px-6 py-4">{reservation.restaurantName}</td>
                      <td className="px-6 py-4">{reservation.userName}</td>
                      <td className="px-6 py-4">{reservation.date} · {formatReservationTime(reservation.startTime)}</td>
                      <td className="px-6 py-4">{reservation.people}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[reservation.status]}`}>
                          {reservation.status.replace("_", " ")}
                        </span>
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
