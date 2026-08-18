import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import EmptyState from "../../components/superAdmin/EmptyState";
import MetricCard from "../../components/superAdmin/MetricCard";
import {
  GlobalReservationTrendChart,
  ReservationStatusDistributionChart,
  RestaurantGrowthChart,
} from "../../components/superAdmin/SuperAdminCharts";
import { superAdminDashboardPreviewData } from "../../data/superAdminPreviewData";
import { CalenderIcon, CloseLineIcon, GroupIcon, PageIcon } from "../../icons";

export default function Home() {
  const { summary } = superAdminDashboardPreviewData;

  return (
    <>
      <PageMeta
        title="Administración global | InnovaRest"
        description="Resumen global de la plataforma InnovaRest."
      />

      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-gray-900 px-6 py-8 text-white shadow-theme-lg dark:bg-gray-800 md:px-8">
          <div className="absolute -right-20 -top-24 size-64 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 size-64 rounded-full bg-orange-500/15 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                <span className="size-2 rounded-full bg-success-400" />
                Superadministración InnovaRest
              </span>
              <h1 className="mt-4 text-2xl font-bold md:text-3xl">Control global de la plataforma</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65 md:text-base">
                Supervisa restaurantes, usuarios y reservas desde una vista central preparada
                para conectarse con la información real del sistema.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white/80">
                Datos de demostración visual
              </span>
              <Link
                to="/superadmin/restaurantes"
                className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Gestionar restaurantes
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Restaurantes registrados"
            value={summary.restaurants}
            note={`${summary.activeRestaurants} activos`}
            to="/superadmin/restaurantes"
            icon={<PageIcon className="size-6" />}
          />
          <MetricCard
            title="Usuarios registrados"
            value={summary.users.toLocaleString("es-CO")}
            note="Plataforma"
            to="/superadmin/usuarios"
            tone="success"
            icon={<GroupIcon className="size-6" />}
          />
          <MetricCard
            title="Reservas del mes"
            value={summary.reservationsThisMonth}
            note="Mes actual"
            to="/superadmin/reservas"
            tone="warning"
            icon={<CalenderIcon className="size-6" />}
          />
          <MetricCard
            title="Cancelaciones"
            value={summary.cancelledThisMonth}
            note="Mes actual"
            to="/superadmin/reservas"
            tone="error"
            icon={<CloseLineIcon className="size-6" />}
          />
        </section>

        <section className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-8"><GlobalReservationTrendChart /></div>
          <div className="col-span-12 xl:col-span-4"><ReservationStatusDistributionChart /></div>
          <div className="col-span-12 xl:col-span-7"><RestaurantGrowthChart /></div>
          <div className="col-span-12 xl:col-span-5">
            <section className="h-full rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Últimos restaurantes</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Registros recientes de la plataforma</p>
                </div>
                <PageIcon className="size-6 text-brand-500" />
              </div>
              <EmptyState
                icon={<PageIcon className="size-7" />}
                title="Aún no hay restaurantes cargados"
                description="Cuando la API entregue registros, los establecimientos más recientes aparecerán aquí."
              />
            </section>
          </div>
        </section>
      </div>
    </>
  );
}
