import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import EmptyState from "../../components/restaurantAdmin/EmptyState";
import PageHeading from "../../components/restaurantAdmin/PageHeading";
import { useAuth } from "../../context/AuthContext";
import {
  cancelReservation,
  formatReservationTime,
  listReservations,
  markReservationNoShow,
  type Reservation,
  type ReservationStatus,
} from "../../services/reservations";
import { CalenderIcon, ListIcon } from "../../icons";

const statusStyles: Record<ReservationStatus, string> = {
  CONFIRMADA: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  CANCELADA: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  NO_SHOW: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
};

export default function Reservations() {
  const { accessToken } = useAuth() as { accessToken: string | null };
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<"TODAS" | ReservationStatus>("TODAS");
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    if (!accessToken) {
      setAllReservations([]);
      setError("La sesión no tiene un token válido.");
      setIsLoading(false);
      return () => controller.abort();
    }

    const loadAgenda = async () => {
      setIsLoading(true);
      setError("");

      try {
        const data = await listReservations(accessToken, {
          signal: controller.signal,
        });
        setAllReservations(data);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadAgenda();
    return () => controller.abort();
  }, [accessToken, reloadKey]);

  const reservations = useMemo(
    () => allReservations.filter((reservation) => (
      (!date || reservation.date === date)
      && (status === "TODAS" || reservation.status === status)
    )),
    [allReservations, date, status],
  );

  const updateReservation = (updatedReservation: Reservation) => {
    setAllReservations((current) => current.map((reservation) => (
      reservation.id === updatedReservation.id ? updatedReservation : reservation
    )));
  };

  const runAction = async (
    reservation: Reservation,
    action: "cancel" | "no-show",
  ) => {
    if (!accessToken) return;

    const actionLabel = action === "cancel" ? "cancelar" : "marcar como no-show";
    if (!window.confirm(`¿Deseas ${actionLabel} la reserva #${reservation.id}?`)) {
      return;
    }

    setProcessingId(reservation.id);
    setActionMessage("");
    setActionError(false);

    try {
      const updatedReservation = action === "cancel"
        ? await cancelReservation(accessToken, reservation.id)
        : await markReservationNoShow(accessToken, reservation.id);
      updateReservation(updatedReservation);
      setActionMessage(
        action === "cancel"
          ? `La reserva #${reservation.id} fue cancelada.`
          : `La reserva #${reservation.id} fue marcada como no-show.`,
      );
    } catch (requestError) {
      setActionMessage(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible actualizar la reserva.",
      );
      setActionError(true);
    } finally {
      setProcessingId(null);
    }
  };

  const clearFilters = () => {
    setDate("");
    setStatus("TODAS");
  };

  return (
    <>
      <PageMeta
        title="Reservas | Panel InnovaRest"
        description="Agenda y gestión de reservas del restaurante."
      />

      <div className="space-y-6">
        <PageHeading
          title="Reservas"
          description="Consulta la agenda, filtra por estado y deja preparadas las acciones operativas del restaurante."
        />

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fecha
              </span>
              <div className="relative">
                <CalenderIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-700 outline-none transition focus:border-brand-400 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Estado
              </span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-brand-400 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value="TODAS">Todas</option>
                <option value="CONFIRMADA">Confirmadas</option>
                <option value="CANCELADA">Canceladas</option>
                <option value="NO_SHOW">No show</option>
              </select>
            </label>

            <button
              type="button"
              onClick={clearFilters}
              className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-600 transition hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:text-gray-300"
            >
              Limpiar filtros
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-white/90">Agenda</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {reservations.length} reservas encontradas
              </p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              Datos del restaurante
            </span>
          </div>

          {actionMessage && (
            <p
              className={`mx-5 mt-4 rounded-xl px-4 py-3 text-sm sm:mx-6 ${
                actionError
                  ? "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                  : "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
              }`}
              role="status"
            >
              {actionMessage}
            </p>
          )}

          {isLoading ? (
            <EmptyState
              icon={<ListIcon className="size-7" />}
              title="Cargando agenda..."
              description="Estamos consultando las reservas reales del restaurante."
            />
          ) : error ? (
            <EmptyState
              icon={<ListIcon className="size-7" />}
              title="No fue posible cargar la agenda"
              description={error}
              action={
                <button
                  type="button"
                  onClick={() => setReloadKey((current) => current + 1)}
                  className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  Intentar nuevamente
                </button>
              }
            />
          ) : reservations.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Fecha y hora</th>
                    <th className="px-6 py-3 font-medium">Cliente</th>
                    <th className="px-6 py-3 font-medium">Personas</th>
                    <th className="px-6 py-3 font-medium">Mesa asignada</th>
                    <th className="px-6 py-3 font-medium">Estado</th>
                    <th className="px-6 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {reservations.map((reservation) => (
                    <tr key={reservation.id}>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                        <span className="block">{reservation.date}</span>
                        <span className="mt-1 block text-xs font-normal text-gray-500">
                          {formatReservationTime(reservation.startTime)}–{formatReservationTime(reservation.endTime)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {reservation.userName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {reservation.people}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {reservation.requiresArrangement
                          ? "Acomodación interna"
                          : reservation.tables.map((table) => table.name).join(", ") || "Sin mesa"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[reservation.status]}`}>
                          {reservation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {reservation.status === "CONFIRMADA" ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => runAction(reservation, "cancel")}
                              disabled={processingId === reservation.id}
                              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-error-300 hover:text-error-600 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => runAction(reservation, "no-show")}
                              disabled={processingId === reservation.id}
                              className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
                            >
                              Marcar no-show
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Sin acciones pendientes</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<ListIcon className="size-7" />}
              title="No hay reservas para mostrar"
              description="No se encontraron reservas del restaurante con los filtros seleccionados."
            />
          )}
        </section>
      </div>
    </>
  );
}
