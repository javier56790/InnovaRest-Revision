import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import EmptyState from "../../components/restaurantAdmin/EmptyState";
import MetricCard from "../../components/restaurantAdmin/MetricCard";
import {
  OccupancyByHourChart,
  ReservationStatusChart,
  ReservationTrendChart,
} from "../../components/restaurantAdmin/OperationalCharts";
import { dashboardPreviewData } from "../../data/adminPreviewData";
import {
  AlertIcon,
  CalenderIcon,
  CheckCircleIcon,
  TableIcon,
  TimeIcon,
} from "../../icons";

export default function Home() {
  const { summary } = dashboardPreviewData;

  return (
    <>
      <PageMeta
        title="Inicio | Panel InnovaRest"
        description="Resumen operativo del restaurante en InnovaRest."
      />

      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-gray-900 px-6 py-8 text-white shadow-theme-lg dark:bg-gray-800 md:px-8">
          <div className="absolute -right-20 -top-24 size-64 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                <span className="size-2 rounded-full bg-success-400" />
                Panel del restaurante
              </span>
              <h1 className="mt-4 text-2xl font-bold md:text-3xl">
                Control operativo en un solo lugar
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65 md:text-base">
                Consulta reservas, disponibilidad y comportamiento del servicio
                desde una vista clara y preparada para conectarse a los datos reales.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white/80">
                Datos de demostración visual
              </span>
              <Link
                to="/panel-restaurante/reservas"
                className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Ver reservas
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Reservas de hoy"
            value={summary.todayReservations}
            note="Hoy"
            to="/panel-restaurante/reservas"
            tone="brand"
            icon={<CalenderIcon className="size-6" />}
          />
          <MetricCard
            title="Mesas disponibles"
            value={summary.availableTables}
            note="Ahora"
            to="/panel-restaurante/mesas"
            tone="success"
            icon={<CheckCircleIcon className="size-6" />}
          />
          <MetricCard
            title="Mesas ocupadas"
            value={summary.occupiedTables}
            note="En servicio"
            to="/panel-restaurante/mesas"
            tone="warning"
            icon={<TableIcon className="size-6" />}
          />
          <MetricCard
            title="No show"
            value={summary.noShows}
            note="Esta semana"
            to="/panel-restaurante/reservas"
            tone="error"
            icon={<AlertIcon className="size-6" />}
          />
        </section>

        <section className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-8">
            <ReservationTrendChart />
          </div>
          <div className="col-span-12 xl:col-span-4">
            <ReservationStatusChart />
          </div>
          <div className="col-span-12 xl:col-span-7">
            <OccupancyByHourChart />
          </div>
          <div className="col-span-12 xl:col-span-5">
            <section className="h-full rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    Próximas reservas
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Agenda inmediata del restaurante
                  </p>
                </div>
                <TimeIcon className="size-6 text-brand-500" />
              </div>
              <EmptyState
                icon={<CalenderIcon className="size-7" />}
                title="Aún no hay reservas cargadas"
                description="Cuando la API entregue la agenda, las próximas reservas aparecerán aquí automáticamente."
              />
            </section>
          </div>
        </section>
      </div>
    </>
  );
}
