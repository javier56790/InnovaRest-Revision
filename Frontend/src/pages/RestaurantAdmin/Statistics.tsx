import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import MetricCard from "../../components/restaurantAdmin/MetricCard";
import {
  OccupancyByHourChart,
  ReservationStatusChart,
  ReservationTrendChart,
} from "../../components/restaurantAdmin/OperationalCharts";
import PageHeading from "../../components/restaurantAdmin/PageHeading";
import { dashboardPreviewData } from "../../data/adminPreviewData";
import { AlertIcon, CalenderIcon, CheckCircleIcon, TableIcon } from "../../icons";

export default function Statistics() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { summary } = dashboardPreviewData;

  return (
    <>
      <PageMeta
        title="Estadísticas | Panel InnovaRest"
        description="Indicadores operativos del restaurante por periodo."
      />

      <div className="space-y-6">
        <PageHeading
          title="Estadísticas"
          description="Analiza las reservas, cancelaciones, inasistencias y nivel de ocupación por rango de fechas."
          action={
            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              Datos de demostración visual
            </span>
          }
        />

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
            <label>
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Desde</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="admin-input"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Hasta</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="admin-input"
              />
            </label>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Reservas" value={summary.todayReservations} note="Periodo" icon={<CalenderIcon className="size-6" />} />
          <MetricCard title="Disponibles" value={summary.availableTables} note="Actual" tone="success" icon={<CheckCircleIcon className="size-6" />} />
          <MetricCard title="Ocupadas" value={summary.occupiedTables} note="Actual" tone="warning" icon={<TableIcon className="size-6" />} />
          <MetricCard title="No show" value={summary.noShows} note="Periodo" tone="error" icon={<AlertIcon className="size-6" />} />
        </section>

        <section className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-8"><ReservationTrendChart /></div>
          <div className="col-span-12 xl:col-span-4"><ReservationStatusChart /></div>
          <div className="col-span-12"><OccupancyByHourChart /></div>
        </section>
      </div>
    </>
  );
}
