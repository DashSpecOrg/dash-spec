import type { CSSProperties } from "react";
import type { DashboardCardSpec } from "@dash-spec/core";
import {
  listDashboards,
  loadDashboard,
  type DashboardListing,
} from "../lib/rustfs";
import { runProSquareQuery, type ProSquareQueryResult } from "../lib/prosquare";

type DemoPageProps = {
  searchParams?: Promise<{
    dashboard?: string;
  }>;
};

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

function toLabel(value: unknown): string {
  if (value === null || value === undefined) {
    return "n/a";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
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

function CardChart({ execution }: { execution: CardExecution }) {
  if (execution.error || !execution.result) {
    return <div className="chart-empty">{execution.error}</div>;
  }

  const { result } = execution;

  switch (result.plotFunction) {
    case "BAR":
      return <BarChart rows={result.rows} />;
    case "LINE":
    case "AREA":
      return <LineChart rows={result.rows} />;
    case "SCATTER":
      return <ScatterChart rows={result.rows} />;
    case "PIE":
      return <PieChart rows={result.rows} />;
    default:
      return (
        <div className="chart-empty">
          Unsupported chart type for the current demo.
        </div>
      );
  }
}

function BarChart({ rows }: { rows: Record<string, unknown>[] }) {
  const max = Math.max(...rows.map((row) => toNumber(row.value)), 1);

  return (
    <div className="bar-chart">
      {rows.map((row, index) => {
        const value = toNumber(row.value);
        const width = `${(value / max) * 100}%`;

        return (
          <div
            className="bar-chart-row"
            key={`${toLabel(row.category)}-${index}`}
          >
            <div className="bar-chart-labels">
              <span>{toLabel(row.category)}</span>
              <strong>{formatMetric(value)}</strong>
            </div>
            <div className="bar-chart-track">
              <div className="bar-chart-fill" style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ rows }: { rows: Record<string, unknown>[] }) {
  const values = rows.map((row) => toNumber(row.y));
  const labels = rows.map((row) => toLabel(row.x));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  const points = values
    .map((value, index) => {
      const x = rows.length === 1 ? 160 : (index / (rows.length - 1)) * 320;
      const y = 170 - ((value - min) / range) * 140;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="line-chart">
      <svg
        viewBox="0 0 320 190"
        className="line-chart-svg"
        role="img"
        aria-label="Line chart"
      >
        <path d="M0 170 H320" className="chart-grid-line" />
        <path d="M0 100 H320" className="chart-grid-line chart-grid-line-mid" />
        <polyline points={points} className="line-chart-path" />
        {values.map((value, index) => {
          const x = rows.length === 1 ? 160 : (index / (rows.length - 1)) * 320;
          const y = 170 - ((value - min) / range) * 140;

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
      </svg>
      <div className="line-chart-labels">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function ScatterChart({ rows }: { rows: Record<string, unknown>[] }) {
  const xValues = rows.map((row) => toNumber(row.x));
  const yValues = rows.map((row) => toNumber(row.y));
  const maxX = Math.max(...xValues, 1);
  const maxY = Math.max(...yValues, 1);

  return (
    <div className="scatter-chart">
      <svg
        viewBox="0 0 320 190"
        className="line-chart-svg"
        role="img"
        aria-label="Scatter chart"
      >
        <path d="M30 170 H310" className="chart-grid-line" />
        <path d="M30 20 V170" className="chart-grid-line" />
        {rows.map((row, index) => {
          const x = 30 + (toNumber(row.x) / maxX) * 270;
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
      </svg>
      <div className="scatter-chart-meta">
        <span>X: quantity</span>
        <span>Y: revenue</span>
      </div>
    </div>
  );
}

function PieChart({ rows }: { rows: Record<string, unknown>[] }) {
  const values = rows.map((row) => toNumber(row.value));
  const total = Math.max(
    values.reduce((sum, value) => sum + value, 0),
    1,
  );
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
      <div
        className="pie-chart-visual"
        style={{ backgroundImage: `conic-gradient(${stops})` }}
      />
      <div className="pie-chart-legend">
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
            <strong>{Math.round((toNumber(row.value) / total) * 100)}%</strong>
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
      <CardChart execution={execution} />
      <div className="dashboard-card-footer">
        <code>{card.expr}</code>
        {"result" in execution && execution.result ? (
          <span>{execution.result.rows.length} row(s)</span>
        ) : (
          <span>query failed</span>
        )}
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
            <a
              className={
                isActive
                  ? "dashboard-nav-item dashboard-nav-item-active"
                  : "dashboard-nav-item"
              }
              href={`/demo?dashboard=${encodeURIComponent(dashboard.key)}`}
              key={dashboard.key}
            >
              <span className="dashboard-nav-item-name">{dashboard.title}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

export async function DemoContent({ searchParams }: DemoPageProps) {
  try {
    const params = (await searchParams) ?? {};
    const dashboards = await listDashboards();
    const selectedKey = dashboards.some(
      (dashboard) => dashboard.key === params.dashboard,
    )
      ? (params.dashboard as string)
      : dashboards[0]?.key;

    if (!selectedKey) {
      throw new Error("No dashboards are available");
    }

    const dashboard = await loadDashboard(selectedKey);
    const cards = await Promise.all(
      dashboard.spec.cards.map(async (card): Promise<CardExecution> => {
        try {
          const result = await runProSquareQuery(card.parsedExpr);
          return { card, result };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Query execution failed";
          return { card, error: message };
        }
      }),
    );

    return (
      <main className="home-page demo-page">
        <section className="demo-section">
          <div className="page-breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
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
                <summary className="dashboard-yaml-toggle" aria-labelledby="dashboard-yaml-title">
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
                  {cards.map((execution) => (
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Dashboard loading failed";

    return (
      <main className="home-page demo-page">
        <section className="demo-section">
          <div className="page-breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span>/</span>
            <span>Demo</span>
          </div>

          <div className="demo-error-panel">
            <p className="hero-chip">Integration unavailable</p>
            <h1>
              DashSpec expects RustFS and ProSquare to be available for the
              demo.
            </h1>
            <p>{message}</p>
          </div>
        </section>
      </main>
    );
  }
}
