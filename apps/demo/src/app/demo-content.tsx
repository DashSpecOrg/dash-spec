"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import type { DashboardCardSpec, DashboardSpec } from "@dash-spec/core";
import { type DashboardListing } from "../lib/rustfs";
import { type ProSquareQueryResult } from "../lib/prosquare";
import type {
  BarPlotCall,
  PiePlotCall,
  PointPlotCall,
} from "pql-parser/dist/types";
import { Bar, Doughnut, Line, Scatter } from "react-chartjs-2";
import "./chartjs-setup";

type CardExecution =
  | {
      card: DashboardCardSpec;
      result: ProSquareQueryResult;
      error?: undefined;
    }
  | {
      card: DashboardCardSpec;
      result?: undefined;
      error: string;
    };

type LoadedDashboard = {
  spec: DashboardSpec;
  yaml: string;
  source: string;
  key: string;
  cards: CardExecution[];
};

function formatDateLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function toLabel(value: unknown): string {
  if (value === null || value === undefined) {
    return "n/a";
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}(?:[T ][\d:.+-Z]*)?$/.test(value)) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return formatDateLabel(parsed);
      }
    }

    return value;
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  }

  if (value instanceof Date) {
    return formatDateLabel(value);
  }

  return String(value);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? 0 : numeric;
  }

  return 0;
}

function formatMetric(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function unitForColumn(column?: string): string {
  switch (column) {
    case "bounce_rate":
      return "%";
    case "avg_session_duration_sec":
      return "sec";
    case "revenue":
    case "cost":
    case "gross_profit":
    case "unit_price":
    case "budget":
      return "$";
    case "quantity":
    case "sessions":
    case "page_views":
    case "new_users":
    case "clicks":
    case "conversions":
    case "impressions":
      return "count";
    default:
      return "";
  }
}

function formatAxisValue(value: number, unit: string): string {
  if (unit === "$") {
    return `$${formatMetric(value)}`;
  }

  if (unit === "%") {
    return `${value.toFixed(0)}%`;
  }

  if (unit) {
    return `${formatMetric(value)} ${unit}`;
  }

  return formatMetric(value);
}

function labelForColumn(column?: string, fallback?: string): string {
  return column ?? fallback ?? "value";
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : `Request failed for ${path}`,
    );
  }

  return payload as T;
}

function ChartjsBar({ execution, rows }: { execution: CardExecution; rows: Record<string, unknown>[] }) {
  const plotClause = execution.card.parsedExpr.plotClause as BarPlotCall;
  const labels = rows.map((r) => toLabel(r.category));
  const values = rows.map((r) => toNumber(r.value));
  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: "#7d3ff2",
      borderRadius: 8,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { title: { display: true, text: labelForColumn(plotClause.categoriesColumn.column, plotClause.categoriesColumn.identifier) } },
      y: {
        title: { display: true, text: labelForColumn(plotClause.valuesColumn.column, plotClause.valuesColumn.identifier) },
        ticks: { callback: (value: string | number) => formatAxisValue(value as number, unitForColumn(plotClause.valuesColumn.column)) },
      },
    },
  };
  return <Bar data={data} options={options} />;
}

function ChartjsLine({ execution, rows }: { execution: CardExecution; rows: Record<string, unknown>[] }) {
  const plotClause = execution.card.parsedExpr.plotClause as PointPlotCall;
  const labels = rows.map((r) => (isDateValue(r.x) ? formatShortDate(r.x) : toLabel(r.x)));
  const values = rows.map((r) => toNumber(r.y));
  const data = {
    labels,
    datasets: [{
      data: values,
      borderColor: "#7d3ff2",
      pointBackgroundColor: "#253351",
      pointRadius: 4,
      fill: false,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { title: { display: true, text: labelForColumn(plotClause.xColumn.column, plotClause.xColumn.identifier) } },
      y: {
        title: { display: true, text: labelForColumn(plotClause.yColumn.column, plotClause.yColumn.identifier) },
        ticks: { callback: (value: string | number) => formatAxisValue(value as number, unitForColumn(plotClause.yColumn.column)) },
      },
    },
  };
  return <Line data={data} options={options} />;
}

function ChartjsArea({ execution, rows }: { execution: CardExecution; rows: Record<string, unknown>[] }) {
  const plotClause = execution.card.parsedExpr.plotClause as PointPlotCall;
  const labels = rows.map((r) => (isDateValue(r.x) ? formatShortDate(r.x) : toLabel(r.x)));
  const values = rows.map((r) => toNumber(r.y));
  const data = {
    labels,
    datasets: [{
      data: values,
      borderColor: "#7d3ff2",
      backgroundColor: "rgba(125, 63, 242, 0.15)",
      pointBackgroundColor: "#253351",
      pointRadius: 4,
      fill: true,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { title: { display: true, text: labelForColumn(plotClause.xColumn.column, plotClause.xColumn.identifier) } },
      y: {
        title: { display: true, text: labelForColumn(plotClause.yColumn.column, plotClause.yColumn.identifier) },
        ticks: { callback: (value: string | number) => formatAxisValue(value as number, unitForColumn(plotClause.yColumn.column)) },
      },
    },
  };
  return <Line data={data} options={options} />;
}

function ChartjsScatter({ execution, rows }: { execution: CardExecution; rows: Record<string, unknown>[] }) {
  const plotClause = execution.card.parsedExpr.plotClause as PointPlotCall;
  const points = rows.map((r) => ({ x: toNumber(r.x), y: toNumber(r.y) }));
  const data = {
    datasets: [{
      data: points,
      backgroundColor: "#253351",
      pointRadius: 5,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        title: { display: true, text: labelForColumn(plotClause.xColumn.column, plotClause.xColumn.identifier) },
        ticks: { callback: (value: string | number) => formatAxisValue(value as number, unitForColumn(plotClause.xColumn.column)) },
      },
      y: {
        title: { display: true, text: labelForColumn(plotClause.yColumn.column, plotClause.yColumn.identifier) },
        ticks: { callback: (value: string | number) => formatAxisValue(value as number, unitForColumn(plotClause.yColumn.column)) },
      },
    },
  };
  return <Scatter data={data} options={options} />;
}

const PIE_COLORS = ["#7d3ff2", "#253351", "#4d68a8", "#9f6fff", "#8db3ff", "#53b1c9"];

function ChartjsPie({ execution, rows }: { execution: CardExecution; rows: Record<string, unknown>[] }) {
  const plotClause = execution.card.parsedExpr.plotClause as PiePlotCall;
  const labels = rows.map((r) => toLabel(r.category));
  const values = rows.map((r) => toNumber(r.value));
  const bgColors = values.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]);
  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: bgColors,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "right" as const,
      },
    },
  };
  return <Doughnut data={data} options={options} />;
}

function CardChart({ execution }: { execution: CardExecution }) {
  if (execution.error || !execution.result) {
    return <div className="chart-empty">{execution.error}</div>;
  }

  const { result } = execution;

  switch (result.plotFunction) {
    case "BAR":
      return <ChartjsBar execution={execution} rows={result.rows} />;
    case "LINE":
      return <ChartjsLine execution={execution} rows={result.rows} />;
    case "AREA":
      return <ChartjsArea execution={execution} rows={result.rows} />;
    case "SCATTER":
      return <ChartjsScatter execution={execution} rows={result.rows} />;
    case "PIE":
      return <ChartjsPie execution={execution} rows={result.rows} />;
    default:
      return <div className="chart-empty">Unsupported chart type.</div>;
  }
}


function isDateValue(value: unknown): boolean {
  if (value instanceof Date) return true;
  if (typeof value === "string") {
    return /^\d{4}-\d{2}-\d{2}(?:[T ][\d:.+-Z]*)?$/.test(value);
  }
  return false;
}

function formatShortDate(value: unknown): string {
  const date =
    value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(date.getTime())) return toLabel(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(date);
}



function DashboardCard({ execution }: { execution: CardExecution }) {
  const { card } = execution;
  const style = {
    gridColumn: `${card.pos.cols.start} / ${card.pos.cols.end + 1}`,
    gridRow: `${card.pos.rows.start} / ${card.pos.rows.end + 1}`,
  } satisfies CSSProperties;

  return (
    <article className="dashboard-card" style={style}>
      <div className="dashboard-card-header">
        <div>
          <p className="dashboard-card-kicker">{card.name}</p>
          <h3>{card.title}</h3>
          <p className="dashboard-card-description">{card.description}</p>
        </div>
        <span className="dashboard-card-plot">
          {card.parsedExpr.plotClause.plotFunction}
        </span>
      </div>
      <div className="dashboard-card-chart">
        <CardChart execution={execution} />
      </div>
      <div className="dashboard-card-footer">
        <code>{card.expr}</code>
      </div>
    </article>
  );
}

function DashboardNav({
  dashboards,
  selectedKey,
}: {
  dashboards: DashboardListing[];
  selectedKey: string;
}) {
  return (
    <aside className="dashboard-nav">
      <div className="dashboard-nav-header">
        <h2>Sample dashboards</h2>
      </div>
      <nav className="dashboard-nav-list" aria-label="Dashboard list">
        {dashboards.map((dashboard) => {
          const isActive = dashboard.key === selectedKey;
          return (
            <Link
              className={
                isActive
                  ? "dashboard-nav-item dashboard-nav-item-active"
                  : "dashboard-nav-item"
              }
              href={`/demo?dashboard=${encodeURIComponent(dashboard.key)}`}
              key={dashboard.key}
            >
              <span className="dashboard-nav-item-name">{dashboard.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function DemoContent() {
  const searchParams = useSearchParams();
  const requestedKey = searchParams.get("dashboard");

  const [dashboards, setDashboards] = useState<DashboardListing[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [dashboard, setDashboard] = useState<LoadedDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const listPayload = await fetchJson<{ dashboards: DashboardListing[] }>(
          "/api/dashboards",
        );
        if (cancelled) {
          return;
        }

        setDashboards(listPayload.dashboards);

        const resolvedKey = listPayload.dashboards.some(
          (dashboard) => dashboard.key === requestedKey,
        )
          ? requestedKey!
          : (listPayload.dashboards[0]?.key ?? "");

        if (!resolvedKey) {
          throw new Error("No dashboards are available");
        }

        setSelectedKey(resolvedKey);

        const detailPayload = await fetchJson<LoadedDashboard>(
          `/api/dashboards/${resolvedKey
            .split("/")
            .map(encodeURIComponent)
            .join("/")}`,
        );
        if (cancelled) {
          return;
        }

        setDashboard(detailPayload);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Dashboard loading failed";
        setError(message);
        setDashboard(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [requestedKey]);

  if (error) {
    return (
      <main className="home-page demo-page">
        <section className="demo-section">
          <div className="page-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>Demo</span>
          </div>

          <div className="demo-error-panel">
            <p className="hero-chip">Integration unavailable</p>
            <h1>
              DashSpec expects RustFS and ProSquare to be available for the
              demo.
            </h1>
            <p>{error}</p>
          </div>
        </section>
      </main>
    );
  }

  if (isLoading || !dashboard) {
    return (
      <main className="home-page demo-page">
        <section className="demo-section">
          <div className="page-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>Demo</span>
          </div>

          <div className="demo-error-panel">
            <p className="hero-chip">Loading</p>
            <h1>Loading dashboard showcase</h1>
            <p>Fetching dashboard definitions from the demo API.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="home-page demo-page">
      <section className="demo-section">
        <div className="page-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Demo</span>
        </div>

        <div className="section-heading">
          <div>
            <p className="section-kicker">Demo</p>
            <h1>Dashboard showcase</h1>
            <p>
              Browse each sample dashboard as a single YAML-defined document.
            </p>
          </div>
        </div>

        <div className="dashboard-browser">
          <DashboardNav dashboards={dashboards} selectedKey={selectedKey} />

          <div className="dashboard-browser-content">
            <details className="dashboard-yaml-panel" open>
              <summary
                className="dashboard-yaml-toggle"
                aria-labelledby="dashboard-yaml-title"
              >
                <div className="dashboard-yaml-header">
                  <p className="section-kicker">YAML</p>
                  <h3 id="dashboard-yaml-title">Dashboard definition</h3>
                </div>
                <span className="dashboard-yaml-toggle-when-open">
                  Hide YAML
                </span>
                <span className="dashboard-yaml-toggle-when-closed">
                  Show YAML
                </span>
              </summary>
              <pre className="dashboard-yaml-code">
                <code>{dashboard.yaml}</code>
              </pre>
            </details>

            <div className="dashboard-document">
              <div className="dashboard-document-header">
                <div>
                  <p className="section-kicker">Dashboard</p>
                  <h2>{dashboard.spec.title}</h2>
                  <p>{dashboard.spec.description}</p>
                </div>
                <div className="dashboard-document-facts">
                  <span>Spec source: {dashboard.source}</span>
                  <span>Cards: {dashboard.spec.cards.length}</span>
                  <span>
                    Grid: {dashboard.spec.dimensions.rows} x{" "}
                    {dashboard.spec.dimensions.cols}
                  </span>
                </div>
              </div>

              <div
                className="dashboard-grid"
                style={{
                  gridTemplateColumns: `repeat(${dashboard.spec.dimensions.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dashboard.spec.dimensions.rows}, minmax(120px, 1fr))`,
                }}
              >
                {dashboard.cards.map((execution) => (
                  <DashboardCard
                    key={execution.card.name}
                    execution={execution}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
