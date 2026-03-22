"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import type { DashboardCardSpec, DashboardSpec } from "@dash-spec/core";
import { type DashboardListing } from "../lib/rustfs";
import { type ProSquareQueryResult } from "../lib/prosquare";
import type { BarPlotCall, PiePlotCall, PointPlotCall } from "pql-parser/dist/types";

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

function CardChart({ execution }: { execution: CardExecution }) {
  if (execution.error || !execution.result) {
    return <div className="chart-empty">{execution.error}</div>;
  }

  const { result } = execution;

  switch (result.plotFunction) {
    case "BAR":
      return <BarChart execution={execution} rows={result.rows} />;
    case "LINE":
    case "AREA":
      return <LineChart execution={execution} rows={result.rows} />;
    case "SCATTER":
      return <ScatterChart execution={execution} rows={result.rows} />;
    case "PIE":
      return <PieChart execution={execution} rows={result.rows} />;
    default:
      return (
        <div className="chart-empty">
          Unsupported chart type for the current demo.
        </div>
      );
  }
}

function BarChart({
  execution,
  rows,
}: {
  execution: Extract<CardExecution, { result: ProSquareQueryResult }>;
  rows: Record<string, unknown>[];
}) {
  const values = rows.map((row) => toNumber(row.value));
  const max = Math.max(...values, 1);
  const clause = execution.card.parsedExpr.plotClause as BarPlotCall;
  const categoryLabel = labelForColumn(
    clause.categoriesColumn.column,
    clause.categoriesColumn.identifier,
  );
  const valueLabel = labelForColumn(
    clause.valuesColumn.column,
    clause.valuesColumn.identifier,
  );
  const valueUnit = unitForColumn(clause.valuesColumn.column);
  const chartWidth = 320;
  const chartHeight = 220;
  const left = 38;
  const right = 16;
  const top = 18;
  const bottom = 50;
  const innerWidth = chartWidth - left - right;
  const innerHeight = chartHeight - top - bottom;
  const step = rows.length > 0 ? innerWidth / rows.length : innerWidth;
  const barWidth = Math.min(28, step * 0.64);
  const ticks = [0, 0.5, 1].map((ratio) => ({
    value: Math.round(max * ratio),
    y: top + innerHeight - innerHeight * ratio,
  }));

  return (
    <div className="bar-chart">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="bar-chart-svg"
        role="img"
        aria-label="Bar chart"
      >
        {ticks.map((tick, index) => (
          <g key={`${tick.value}-${index}`}>
            <path
              d={`M${left} ${tick.y} H${chartWidth - right}`}
              className={
                index === 0 ? "chart-axis-line" : "chart-grid-line chart-grid-line-mid"
              }
            />
            <text x={left - 8} y={tick.y + 4} className="chart-axis-label">
              {formatAxisValue(tick.value, valueUnit)}
            </text>
          </g>
        ))}

        <path
          d={`M${left} ${top} V${top + innerHeight} H${chartWidth - right}`}
          className="chart-axis-line"
        />

        {rows.map((row, index) => {
          const value = toNumber(row.value);
          const height = (value / max) * innerHeight;
          const x = left + step * index + (step - barWidth) / 2;
          const y = top + innerHeight - height;

          return (
            <g key={`${toLabel(row.category)}-${index}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx="8"
                className="bar-chart-rect"
              />
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                className="bar-chart-value"
              >
                {formatAxisValue(value, valueUnit)}
              </text>
              <text
                x={x + barWidth / 2}
                y={chartHeight - 18}
                textAnchor="middle"
                className="bar-chart-category"
              >
                {toLabel(row.category)}
              </text>
            </g>
          );
        })}
        <text
          x={chartWidth / 2}
          y={chartHeight - 2}
          textAnchor="middle"
          className="chart-axis-title"
        >
          {categoryLabel}
        </text>
        <text
          x="16"
          y={chartHeight / 2}
          textAnchor="middle"
          className="chart-axis-title"
          transform={`rotate(-90 16 ${chartHeight / 2})`}
        >
          {valueLabel}
          {valueUnit ? ` (${valueUnit})` : ""}
        </text>
      </svg>
    </div>
  );
}

function LineChart({
  execution,
  rows,
}: {
  execution: Extract<CardExecution, { result: ProSquareQueryResult }>;
  rows: Record<string, unknown>[];
}) {
  const clause = execution.card.parsedExpr.plotClause as PointPlotCall;
  const values = rows.map((row) => toNumber(row.y));
  const labels = rows.map((row) => toLabel(row.x));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const xLabel = labelForColumn(clause.xColumn.column, clause.xColumn.identifier);
  const yLabel = labelForColumn(clause.yColumn.column, clause.yColumn.identifier);
  const xUnit = unitForColumn(clause.xColumn.column);
  const yUnit = unitForColumn(clause.yColumn.column);
  const xStart = 40;
  const xEnd = 300;
  const chartHeight = 220;
  const yTop = 20;
  const yBottom = 170;
  const xTicks = rows.map((row, index) => ({
    label: toLabel(row.x),
    x: rows.length === 1 ? (xStart + xEnd) / 2 : xStart + (index / (rows.length - 1)) * (xEnd - xStart),
  }));
  const yTicks = [0, 0.5, 1].map((ratio) => ({
    value: min + range * ratio,
    y: yBottom - (yBottom - yTop) * ratio,
  }));

  const points = values
    .map((value, index) => {
      const x = rows.length === 1 ? (xStart + xEnd) / 2 : xStart + (index / (rows.length - 1)) * (xEnd - xStart);
      const y = yBottom - ((value - min) / range) * (yBottom - yTop);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="line-chart">
      <svg
        viewBox={`0 0 320 ${chartHeight}`}
        className="line-chart-svg"
        role="img"
        aria-label="Line chart"
      >
        {yTicks.map((tick, index) => (
          <g key={`${tick.value}-${index}`}>
            <path
              d={`M${xStart} ${tick.y} H${xEnd}`}
              className={
                index === 0 ? "chart-axis-line" : "chart-grid-line chart-grid-line-mid"
              }
            />
            <text x={xStart - 8} y={tick.y + 4} className="chart-axis-label">
              {formatAxisValue(tick.value, yUnit)}
            </text>
          </g>
        ))}
        <path d={`M${xStart} ${yBottom} H${xEnd}`} className="chart-axis-line" />
        <path d={`M${xStart} ${yBottom} V${yTop}`} className="chart-axis-line" />
        <polyline points={points} className="line-chart-path" />
        {values.map((value, index) => {
          const x =
            rows.length === 1
              ? (xStart + xEnd) / 2
              : xStart + (index / (rows.length - 1)) * (xEnd - xStart);
          const y = yBottom - ((value - min) / range) * (yBottom - yTop);

          return (
            <circle
              key={`${labels[index]}-${index}`}
              cx={x}
              cy={y}
              r="4"
              className="line-chart-point"
            />
          );
        })}
        {xTicks.map((tick, index) => (
          <text
            key={`${tick.label}-${index}`}
            x={tick.x}
            y={188}
            textAnchor="middle"
            className="chart-axis-label chart-axis-label-center"
          >
            {tick.label}
          </text>
        ))}
        <text x="170" y={chartHeight - 6} textAnchor="middle" className="chart-axis-title">
          {xLabel}
          {xUnit ? ` (${xUnit})` : ""}
        </text>
        <text
          x="16"
          y="95"
          textAnchor="middle"
          className="chart-axis-title"
          transform="rotate(-90 16 95)"
        >
          {yLabel}
          {yUnit ? ` (${yUnit})` : ""}
        </text>
      </svg>
    </div>
  );
}

function ScatterChart({
  execution,
  rows,
}: {
  execution: Extract<CardExecution, { result: ProSquareQueryResult }>;
  rows: Record<string, unknown>[];
}) {
  const xValues = rows.map((row) => toNumber(row.x));
  const yValues = rows.map((row) => toNumber(row.y));
  const maxX = Math.max(...xValues, 1);
  const maxY = Math.max(...yValues, 1);
  const clause = execution.card.parsedExpr.plotClause as PointPlotCall;
  const xColumn = clause.xColumn.column ?? clause.xColumn.identifier;
  const yColumn = clause.yColumn.column ?? clause.yColumn.identifier;
  const xUnit = unitForColumn(clause.xColumn.column);
  const yUnit = unitForColumn(clause.yColumn.column);
  const xTicks = [0, 0.5, 1].map((ratio) => ({
    value: maxX * ratio,
    x: 40 + 260 * ratio,
  }));
  const yTicks = [0, 0.5, 1].map((ratio) => ({
    value: maxY * ratio,
    y: 170 - 140 * ratio,
  }));

  return (
    <div className="scatter-chart">
      <svg
        viewBox="0 0 320 190"
        className="line-chart-svg"
        role="img"
        aria-label="Scatter chart"
      >
        <defs>
          <marker
            id="chart-axis-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 Z" className="chart-axis-arrowhead" />
          </marker>
        </defs>
        {yTicks.map((tick, index) => (
          <g key={`y-${tick.value}-${index}`}>
            <path
              d={`M40 ${tick.y} H300`}
              className={
                index === 0 ? "chart-axis-line" : "chart-grid-line chart-grid-line-mid"
              }
            />
            <text x="34" y={tick.y + 4} className="chart-axis-label">
              {formatAxisValue(tick.value, yUnit)}
            </text>
          </g>
        ))}
        {xTicks.map((tick, index) => (
          <g key={`x-${tick.value}-${index}`}>
            <path
              d={`M${tick.x} 20 V170`}
              className={
                index === 0 ? "chart-axis-line" : "chart-grid-line chart-grid-line-mid"
              }
            />
            <text
              x={tick.x}
              y="184"
              textAnchor="middle"
              className="chart-axis-label chart-axis-label-center"
            >
              {formatAxisValue(tick.value, xUnit)}
            </text>
          </g>
        ))}
        <path
          d="M40 170 H300"
          className="chart-axis-line"
          markerEnd="url(#chart-axis-arrow)"
        />
        <path
          d="M40 170 V20"
          className="chart-axis-line"
          markerEnd="url(#chart-axis-arrow)"
        />
        {rows.map((row, index) => {
          const x = 40 + (toNumber(row.x) / maxX) * 260;
          const y = 170 - (toNumber(row.y) / maxY) * 140;
          return (
            <circle
              key={`${index}-${toLabel(row.x)}-${toLabel(row.y)}`}
              cx={x}
              cy={y}
              r="5"
              className="scatter-chart-point"
            />
          );
        })}
        <text x="170" y="188" textAnchor="middle" className="chart-axis-title">
          {xColumn}
          {xUnit ? ` (${xUnit})` : ""}
        </text>
        <text
          x="16"
          y="95"
          textAnchor="middle"
          className="chart-axis-title"
          transform="rotate(-90 16 95)"
        >
          {yColumn}
          {yUnit ? ` (${yUnit})` : ""}
        </text>
      </svg>
    </div>
  );
}

function PieChart({
  execution,
  rows,
}: {
  execution: Extract<CardExecution, { result: ProSquareQueryResult }>;
  rows: Record<string, unknown>[];
}) {
  const clause = execution.card.parsedExpr.plotClause as PiePlotCall;
  const values = rows.map((row) => toNumber(row.value));
  const total = Math.max(
    values.reduce((sum, value) => sum + value, 0),
    1,
  );
  const categoryLabel = labelForColumn(
    clause.categoriesColumn.column,
    clause.categoriesColumn.identifier,
  );
  const valueLabel = labelForColumn(
    clause.valuesColumn.column,
    clause.valuesColumn.identifier,
  );
  const valueUnit = unitForColumn(clause.valuesColumn.column);
  let current = 0;

  const colors = [
    "#7d3ff2",
    "#253351",
    "#4d68a8",
    "#9f6fff",
    "#8db3ff",
    "#53b1c9",
  ];
  const stops = rows
    .map((row, index) => {
      const start = current;
      current += (toNumber(row.value) / total) * 100;
      return `${colors[index % colors.length]} ${start}% ${current}%`;
    })
    .join(", ");

  return (
    <div className="pie-chart">
      <div className="pie-chart-visual-wrap">
        <div
          className="pie-chart-visual"
          style={{ backgroundImage: `conic-gradient(${stops})` }}
        />
        <div className="pie-chart-summary">
          <span>Metric</span>
          <strong>
            {valueLabel}
            {valueUnit ? ` (${valueUnit})` : ""}
          </strong>
          <span>{formatAxisValue(total, valueUnit)} total</span>
        </div>
      </div>
      <div className="pie-chart-legend">
        <div className="pie-chart-meta">
          <span>Dimension: {categoryLabel}</span>
          <span>
            Metric: {valueLabel}
            {valueUnit ? ` (${valueUnit})` : ""}
          </span>
        </div>
        {rows.map((row, index) => (
          <div
            className="pie-chart-legend-row"
            key={`${toLabel(row.category)}-${index}`}
          >
            <span
              className="pie-chart-swatch"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span>{toLabel(row.category)}</span>
            <strong>
              {Math.round((toNumber(row.value) / total) * 100)}% ·{" "}
              {formatAxisValue(toNumber(row.value), valueUnit)}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
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
        <p>
          Choose a dashboard YAML definition from RustFS or the local fallback
          set.
        </p>
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
          : listPayload.dashboards[0]?.key ?? "";

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
            <p>Browse each sample dashboard as a single YAML-defined document.</p>
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
                <span className="dashboard-yaml-toggle-when-open">Hide YAML</span>
                <span className="dashboard-yaml-toggle-when-closed">Show YAML</span>
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
