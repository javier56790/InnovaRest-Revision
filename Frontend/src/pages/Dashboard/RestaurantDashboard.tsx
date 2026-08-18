import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import EmptyState from "../../components/restaurantAdmin/EmptyState";
import MetricCard from "../../components/restaurantAdmin/MetricCard";
import {
  OccupancyByHourChart,
  ReservationStatusChart,
  ReservationTrendChart,
} from "../../components/restaurantAdmin/OperationalCharts";
import { useRestaurantStatistics } from "../../hooks/useRestaurantStatistics";
import { formatReservationTime } from "../../services/reservations";
import {
  AlertIcon,
  CalenderIcon,
  CheckCircleIcon,
  TableIcon,
  TimeIcon,
} from "../../icons";

const formatDate = (value: string) => new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
}).format(new Date(`${value}T00:00:00`));

export default function RestaurantDashboard() {
  const { data, error, isLoading, reload } = useRestaurantStatistics();

  return (
    <>
      <PageMeta
        title="Inicio | Panel InnovaRest"
        description="Resumen operativo real del restaurante en InnovaRest."
      />

      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-gray-900 px-6 py-8 text-white shadow-theme-lg dark:bg-gray-800 md:px-8">
          <div className="absolute -right-20 -top-24 size-64 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                <span className="size-2 rounded-full bg-success-400" />
                Operación en tiempo real
              </span>
              <h1 className="mt-4 text-2xl font-bold md:text-3xl">
                Control operativo en un solo lugar
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65 md:text-base">
                Consulta reservas, mesas y comportamiento del servicio con información obtenida directamente del sistema.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {data && (
                <span className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white/80">
                  {data.period.startDate} a {data.period.endDate}
                </span>
              )}
              <Link
                to="/panel-restaurante/reservas"
                className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Ver reservas
              </Link>
            </div>
          </div>
        </section>

        {isLoading && (
          <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <EmptyState
              icon={<CalenderIcon className="size-7" />}
              title="Calculando indicadores..."
              description="Estamos consultando las reservas y mesas reales del restaurante."
            />
          </section>
        )}

        {error && (
          <section className="rounded-2xl border border-error-200 bg-error-50 dark:border-error-500/25 dark:bg-error-500/10">
            <EmptyState
              icon={<AlertIcon className="size-7" />}
              title="No fue posible cargar el resumen"
              description={error}
              action={(
                <button
                  type="button"
                  onClick={reload}
                  className="rounded-xl bg-error-500 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Intentar nuevamente
                </button>
              )}
            />
          </section>
        )}

        {data && !isLoading && !error && (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Reservas de hoy"
                value={data.summary.todayReservations}
                note="Confirmadas"
                to="/panel-restaurante/reservas"
                tone="brand"
                icon={<CalenderIcon className="size-6" />}
              />
              <MetricCard
                title="Mesas disponibles"
                value={data.summary.availableTables}
                note="Ahora"
                to="/panel-restaurante/mesas"
                tone="success"
                icon={<CheckCircleIcon className="size-6" />}
              />
              <MetricCard
                title="Mesas ocupadas"
                value={data.summary.occupiedTables}
                note="Ahora"
                to="/panel-restaurante/mesas"
                tone="warning"
                icon={<TableIcon className="size-6" />}
              />
              <MetricCard
                title="No show"
                value={data.summary.noShows}
                note="Periodo"
                to="/panel-restaurante/reservas"
                tone="error"
                icon={<AlertIcon className="size-6" />}
              />
            </section>

            <section className="grid grid-cols-12 gap-6">
              <div className="col-span-12 xl:col-span-8">
                <ReservationTrendChart data={data.reservationsByDay} />
              </div>
              <div className="col-span-12 xl:col-span-4">
                <ReservationStatusChart data={data.statusDistribution} />
              </div>
              <div className="col-span-12 xl:col-span-7">
                <OccupancyByHourChart data={data.occupancyByHour} />
              </div>
              <div className="col-span-12 xl:col-span-5">
                <section className="h-full rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        Próximas reservas
                      </h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Las cinco reservas confirmadas más cercanas
                      </p>
                    </div>
                    <TimeIcon className="size-6 text-brand-500" />
                  </div>

                  {data.upcomingReservations.length ? (
                    <div className="divide-y divide-gray-100 px-5 dark:divide-gray-800 sm:px-6">
                      {data.upcomingReservations.map((reservation) => (
                        <article key={reservation.id} className="flex items-center justify-between gap-4 py-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                              {reservation.userName}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(reservation.date)} · {formatReservationTime(reservation.startTime)}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold text-brand-500">{reservation.people} personas</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {reservation.requiresArrangement
                                ? "Acomodación interna"
                                : reservation.tables.map((table) => table.name).join(", ") || "Sin mesa"}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<CalenderIcon className="size-7" />}
                      title="No hay próximas reservas"
                      description="Las nuevas reservas confirmadas aparecerán aquí automáticamente."
                    />
                  )}
                </section>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
