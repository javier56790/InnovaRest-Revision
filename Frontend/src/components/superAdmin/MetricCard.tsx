import type { ReactNode } from "react";
import { Link } from "react-router";

type MetricCardProps = {
  title: string;
  value: number | string;
  note: string;
  icon: ReactNode;
  to?: string;
  tone?: "brand" | "success" | "warning" | "error";
};

const toneClasses = {
  brand: "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
  success: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
  warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
  error: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
};

export default function MetricCard({ title, value, note, icon, to, tone = "brand" }: MetricCardProps) {
  const className = "group block rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition hover:-translate-y-0.5 hover:shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03] md:p-6";
  const content = (
    <>
      <div className={`flex size-12 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
        {icon}
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-800 dark:text-white/90">{value}</p>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {note}
        </span>
      </div>
    </>
  );

  if (!to) return <article className={className}>{content}</article>;

  return (
    <Link
      to={to}
      aria-label={`Ir a ${title}`}
      className={`${className} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:translate-y-0`}
    >
      {content}
    </Link>
  );
}
