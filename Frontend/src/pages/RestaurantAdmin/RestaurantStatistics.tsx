import { type FormEvent, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import EmptyState from "../../components/restaurantAdmin/EmptyState";
import MetricCard from "../../components/restaurantAdmin/MetricCard";
import {
  OccupancyByHourChart,
  ReservationStatusChart,
  ReservationTrendChart,
} from "../../components/restaurantAdmin/OperationalCharts";
import PageHeading from "../../components/restaurantAdmin/PageHeading";
import { useRestaurantStatistics } from "../../hooks/useRestaurantStatistics";
import { AlertIcon, CalenderIcon, CheckCircleIcon, TableIcon } from "../../icons";

const toLocalIsoDate = (value: Date) => [
  value.getFullYear(),
  String(value.getMonth() + 1).padStart(2, "0"),
  String(value.getDate()).padStart(2, "0"),
].join("-");

const today = new Date();
const weekStart = new Date(today);
weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));

const DEFAULT_PERIOD = {
  startDate: toLocalIsoDate(weekStart),
  endDate: toLocalIsoDate(today),
};

export default function RestaurantStatistics() {
  const [filters, setFilters] = useState(DEFAULT_PERIOD);
  const [appliedPeriod, setAppliedPeriod] = useState(DEFAULT_PERIOD);
  const [filterError, setFilterError] = useState("");
  const { data, error, isLoading, reload } = useRestaurantStatistics(appliedPeriod);

  const applyPeriod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!filters.startDate || !filters.endDate) {
      setFilterError("Selecciona ambas fechas.");
      return;
    }

    const start = new Date(`${filters.startDate}T00:00:00`);
    const end = new Date(`${filters.endDate}T00:00:00`);
    const difference = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    if (difference < 0) {
      setFilterError("La fecha final debe ser igual o posterior a la inicial.");
      return;
    }
    if (difference > 30) {
      setFilterError("El periodo máximo permitido es de 31 días.");
      return;
    }

    setFilterError("");
    setAppliedPeriod(filters);
  };

  return (
    <>
      <PageMeta
        title="Estadísticas | Panel InnovaRest"
        description="Indicadores operativos reales del restaurante por periodo."
      />

      <div className="space-y-6">
        <PageHeading
          title="Estadísticas"
          description="Analiza las reservas, cancelaciones, inasistencias y nivel de ocupación por rango de fechas."
          action={data ? (
            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              {data.period.startDate} a {data.period.endDate}
            </span>
          ) : undefined}
        />

        <form
          onSubmit={applyPeriod}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <label>
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Desde</span>
              <input
                type="date"
                value={filters.startDate}
                max={DEFAULT_PERIOD.endDate}
                onChange={(event) => setFilters((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))}
                className="admin-input"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Hasta</span>
              <input
                type="date"
                value={filters.endDate}
                max={DEFAULT_PERIOD.endDate}
                onChange={(event) => setFilters((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))}
                className="admin-input"
              />
            </label>
            <button
              type="submit"
              disabled={isLoading}
              className="h-11 rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
            >
              Aplicar periodo
            </button>
          </div>
          {filterError && (
            <p className="mt-4 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/15 dark:text-error-400">
              {filterError}
            </p>
          )}
        </form>

        {isLoading && (
          <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <EmptyState
              icon={<CalenderIcon className="size-7" />}
              title="Calculando estadísticas..."
              description="Estamos procesando las reservas y asignaciones del periodo seleccionado."
            />
          </section>
        )}

        {error && (
          <section className="rounded-2xl border border-error-200 bg-error-50 dark:border-error-500/25 dark:bg-error-500/10">
            <EmptyState
              icon={<AlertIcon className="size-7" />}
              title="No fue posible cargar las estadísticas"
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
                title="Reservas"
                value={data.summary.totalReservations}
                note="Periodo"
                to="/panel-restaurante/reservas"
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
              <div className="col-span-12">
                <OccupancyByHourChart data={data.occupancyByHour} />
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
