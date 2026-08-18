import type { ApexOptions } from "apexcharts";
import Chart from "react-apexcharts";
import { superAdminDashboardPreviewData } from "../../data/superAdminPreviewData";

const chartFont = "Outfit, sans-serif";

export function GlobalReservationTrendChart() {
  const options: ApexOptions = {
    chart: { fontFamily: chartFont, toolbar: { show: false }, zoom: { enabled: false } },
    colors: ["#ff6347", "#fdb022"],
    dataLabels: { enabled: false },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.4, opacityTo: 0.03, stops: [0, 95, 100] },
    },
    grid: { borderColor: "#f2f4f7", strokeDashArray: 4 },
    legend: { position: "top", horizontalAlign: "right", fontFamily: chartFont },
    markers: { size: 0, hover: { size: 5 } },
    stroke: { curve: "smooth", width: 3 },
    xaxis: {
      categories: superAdminDashboardPreviewData.reservationTrend.labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { min: 0, forceNiceScale: true },
    tooltip: { shared: true, intersect: false },
  };

  const series = [
    { name: "Confirmadas", data: superAdminDashboardPreviewData.reservationTrend.confirmed },
    { name: "Canceladas", data: superAdminDashboardPreviewData.reservationTrend.cancelled },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Reservas de la plataforma</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Evolución mensual de confirmaciones y cancelaciones
      </p>
      <div className="mt-5 min-w-0">
        <Chart type="area" height={310} options={options} series={series} />
      </div>
    </section>
  );
}

export function ReservationStatusDistributionChart() {
  const options: ApexOptions = {
    chart: { fontFamily: chartFont },
    colors: ["#12b76a", "#fdb022", "#f04438"],
    dataLabels: { enabled: false },
    labels: superAdminDashboardPreviewData.statusDistribution.labels,
    legend: { position: "bottom", fontFamily: chartFont },
    plotOptions: {
      pie: {
        donut: {
          size: "72%",
          labels: {
            show: true,
            total: { show: true, label: "Reservas", formatter: () => "100%" },
          },
        },
      },
    },
    stroke: { width: 3, colors: ["#ffffff"] },
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Estado de reservas</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Distribución global del periodo</p>
      <div className="mt-4">
        <Chart
          type="donut"
          height={300}
          options={options}
          series={superAdminDashboardPreviewData.statusDistribution.values}
        />
      </div>
    </section>
  );
}

export function RestaurantGrowthChart() {
  const options: ApexOptions = {
    chart: { fontFamily: chartFont, toolbar: { show: false } },
    colors: ["#ff6347"],
    dataLabels: { enabled: false },
    grid: { borderColor: "#f2f4f7", strokeDashArray: 4 },
    plotOptions: { bar: { borderRadius: 7, columnWidth: "48%", borderRadiusApplication: "end" } },
    xaxis: {
      categories: superAdminDashboardPreviewData.restaurantGrowth.labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { min: 0, forceNiceScale: true },
    tooltip: { y: { formatter: (value) => `${value} restaurantes` } },
  };

  const series = [
    { name: "Restaurantes", data: superAdminDashboardPreviewData.restaurantGrowth.values },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Crecimiento de restaurantes</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Establecimientos registrados por mes</p>
      <div className="mt-5 min-w-0">
        <Chart type="bar" height={290} options={options} series={series} />
      </div>
    </section>
  );
}
