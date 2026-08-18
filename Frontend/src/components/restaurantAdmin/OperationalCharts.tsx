import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { RestaurantStatistics } from "../../services/restaurantAdmin";

const chartFont = "Outfit, sans-serif";

type TrendData = RestaurantStatistics["reservationsByDay"];
type DistributionData = RestaurantStatistics["statusDistribution"];
type OccupancyData = RestaurantStatistics["occupancyByHour"];

const EMPTY_TREND: TrendData = {
  labels: [],
  confirmed: [],
  cancelled: [],
  noShows: [],
};
const EMPTY_DISTRIBUTION: DistributionData = {
  labels: ["Confirmadas", "Canceladas", "No show"],
  values: [0, 0, 0],
};
const EMPTY_OCCUPANCY: OccupancyData = { labels: [], values: [] };

export function ReservationTrendChart({ data = EMPTY_TREND }: { data?: TrendData }) {
  const options: ApexOptions = {
    chart: { fontFamily: chartFont, toolbar: { show: false }, zoom: { enabled: false } },
    colors: ["#ff6347", "#fdb022", "#f04438"],
    dataLabels: { enabled: false },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.42, opacityTo: 0.03, stops: [0, 95, 100] },
    },
    grid: { borderColor: "#f2f4f7", strokeDashArray: 4 },
    legend: { position: "top", horizontalAlign: "right", fontFamily: chartFont },
    markers: { size: 0, hover: { size: 5 } },
    stroke: { curve: "smooth", width: 3 },
    xaxis: {
      categories: data.labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { rotate: data.labels.length > 14 ? -45 : 0 },
    },
    yaxis: { min: 0, forceNiceScale: true },
    tooltip: { shared: true, intersect: false },
  };

  const series = [
    { name: "Confirmadas", data: data.confirmed },
    { name: "Canceladas", data: data.cancelled },
    { name: "No show", data: data.noShows },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Reservas por día
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Confirmaciones, cancelaciones e inasistencias del periodo
        </p>
      </div>
      <div className="mt-5 min-w-0">
        <Chart type="area" height={310} options={options} series={series} />
      </div>
    </section>
  );
}

export function ReservationStatusChart({ data = EMPTY_DISTRIBUTION }: { data?: DistributionData }) {
  const total = data.values.reduce((sum, value) => sum + value, 0);
  const options: ApexOptions = {
    chart: { fontFamily: chartFont },
    colors: ["#12b76a", "#fdb022", "#f04438"],
    dataLabels: { enabled: false },
    labels: data.labels,
    legend: { position: "bottom", fontFamily: chartFont },
    noData: { text: "Sin reservas en el periodo" },
    plotOptions: {
      pie: {
        donut: {
          size: "72%",
          labels: {
            show: true,
            total: { show: true, label: "Reservas", formatter: () => String(total) },
          },
        },
      },
    },
    stroke: { width: 3, colors: ["#ffffff"] },
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
        Estado de las reservas
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Distribución real del periodo seleccionado
      </p>
      <div className="mt-4">
        <Chart type="donut" height={300} options={options} series={data.values} />
      </div>
    </section>
  );
}

export function OccupancyByHourChart({ data = EMPTY_OCCUPANCY }: { data?: OccupancyData }) {
  const options: ApexOptions = {
    chart: { fontFamily: chartFont, toolbar: { show: false } },
    colors: ["#ff6347"],
    dataLabels: { enabled: false },
    grid: { borderColor: "#f2f4f7", strokeDashArray: 4 },
    plotOptions: {
      bar: { borderRadius: 7, columnWidth: "48%", borderRadiusApplication: "end" },
    },
    xaxis: {
      categories: data.labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: { formatter: (value) => `${value}%` },
    },
    tooltip: { y: { formatter: (value) => `${value}% de ocupación` } },
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
        Ocupación por franja horaria
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Promedio de mesas asignadas durante el periodo
      </p>
      <div className="mt-5 min-w-0">
        <Chart type="bar" height={290} options={options} series={[{
          name: "Ocupación",
          data: data.values,
        }]} />
      </div>
    </section>
  );
}
