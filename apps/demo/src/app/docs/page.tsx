import Link from "next/link";

export default function DocsPage() {
  return (
    <main className="home-page docs-page">
      <div className="docs-layout">
        <nav className="docs-sidebar" aria-label="Docs navigation">
          <div className="docs-sidebar-group">
            <span className="docs-sidebar-heading">Getting started</span>
            <a className="docs-sidebar-link" href="#overview">Overview</a>
            <a className="docs-sidebar-link" href="#installation">Installation</a>
          </div>
          <div className="docs-sidebar-group">
            <span className="docs-sidebar-heading">YAML format</span>
            <a className="docs-sidebar-link" href="#dashboard-spec">Dashboard spec</a>
            <a className="docs-sidebar-link" href="#cards">Cards</a>
            <a className="docs-sidebar-link" href="#grid">Grid positioning</a>
          </div>
          <div className="docs-sidebar-group">
            <span className="docs-sidebar-heading">PQL</span>
            <a className="docs-sidebar-link" href="#pql-overview">Overview</a>
            <a className="docs-sidebar-link" href="#plot-functions">Plot functions</a>
            <a className="docs-sidebar-link" href="#aggregations">Aggregations</a>
            <a className="docs-sidebar-link" href="#clauses">Clauses</a>
          </div>
          <div className="docs-sidebar-group">
            <span className="docs-sidebar-heading">API reference</span>
            <a className="docs-sidebar-link" href="#parse-dashboard">parseDashboard()</a>
            <a className="docs-sidebar-link" href="#types">Types</a>
            <a className="docs-sidebar-link" href="#errors">Errors</a>
          </div>
        </nav>

        <div className="docs-content">
          <div className="page-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>Docs</span>
          </div>

          {/* Overview */}
          <section className="docs-section" id="overview">
            <div className="docs-section-header">
              <p className="section-kicker">Getting started</p>
              <h1>@dash-spec/core</h1>
              <p className="docs-lead">
                A TypeScript library for parsing and validating YAML dashboard specifications.
                Define a dashboard's layout, metadata, and visualization intent declaratively —
                then parse it once and render it anywhere.
              </p>
            </div>
          </section>

          {/* Installation */}
          <section className="docs-section" id="installation">
            <h2>Installation</h2>
            <pre className="docs-code"><code>{`npm install @dash-spec/core`}</code></pre>
            <p>Then parse a YAML string into a fully validated <code>DashboardSpec</code>:</p>
            <pre className="docs-code"><code>{`import { parseDashboard } from '@dash-spec/core';

const spec = parseDashboard(yamlString);
// spec.title, spec.dimensions, spec.cards …`}</code></pre>
          </section>

          {/* Dashboard spec */}
          <section className="docs-section" id="dashboard-spec">
            <div className="docs-section-header">
              <p className="section-kicker">YAML format</p>
              <h2>Dashboard spec</h2>
            </div>
            <p>
              A dashboard spec is a single YAML document with top-level metadata and a
              list of cards. Here is a complete example:
            </p>
            <pre className="docs-code"><code>{`name: commerce_overview
title: Commerce overview
description: Revenue, segments, and order trends.
dimensions:
  rows: 6
  cols: 12
cards:
  - name: monthly_revenue
    title: Monthly revenue
    description: Revenue trend across the last 12 months.
    expr: PLOT LINE(month, SUM(revenue)) FROM sales GROUP BY month ORDER BY month ASC LIMIT 12
    pos:
      rows: { start: 1, end: 3 }
      cols: { start: 1, end: 6 }
  - name: category_revenue
    title: Revenue by category
    expr: PLOT BAR(category, SUM(revenue)) FROM sales GROUP BY category ORDER BY category ASC
    pos:
      rows: { start: 1, end: 3 }
      cols: { start: 7, end: 12 }`}</code></pre>

            <table className="docs-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>name</code></td><td>string</td><td>Yes</td><td>Unique machine-readable identifier (snake_case recommended)</td></tr>
                <tr><td><code>title</code></td><td>string</td><td>Yes</td><td>Human-readable display title</td></tr>
                <tr><td><code>description</code></td><td>string</td><td>No</td><td>Optional description shown in the UI</td></tr>
                <tr><td><code>dimensions.rows</code></td><td>integer</td><td>Yes</td><td>Total number of rows in the layout grid</td></tr>
                <tr><td><code>dimensions.cols</code></td><td>integer</td><td>Yes</td><td>Total number of columns in the layout grid</td></tr>
                <tr><td><code>cards</code></td><td>Card[]</td><td>Yes</td><td>One or more card definitions (see below)</td></tr>
              </tbody>
            </table>
          </section>

          {/* Cards */}
          <section className="docs-section" id="cards">
            <h2>Cards</h2>
            <p>
              Each card represents a single visualization panel placed on the grid.
              Card names must be unique within a dashboard.
            </p>
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>name</code></td><td>string</td><td>Yes</td><td>Unique identifier within the dashboard</td></tr>
                <tr><td><code>title</code></td><td>string</td><td>Yes</td><td>Display title for the card panel</td></tr>
                <tr><td><code>description</code></td><td>string</td><td>No</td><td>Optional subtitle or annotation</td></tr>
                <tr><td><code>expr</code></td><td>PQL string</td><td>Yes</td><td>PQL expression defining the visualization</td></tr>
                <tr><td><code>pos</code></td><td>CardPosition</td><td>Yes</td><td>Grid position (rows and cols ranges)</td></tr>
              </tbody>
            </table>
          </section>

          {/* Grid */}
          <section className="docs-section" id="grid">
            <h2>Grid positioning</h2>
            <p>
              Positions are 1-based and inclusive. A card spanning <code>cols: {"{ start: 1, end: 6 }"}</code> on
              a 12-column grid occupies the left half. Cards can overlap — it is the
              renderer's responsibility to handle conflicts.
            </p>
            <pre className="docs-code"><code>{`pos:
  rows:
    start: 1   # first row (1-based)
    end: 3     # last row occupied, inclusive
  cols:
    start: 7
    end: 12`}</code></pre>
            <p>
              Both <code>start</code> and <code>end</code> must be positive integers,
              and <code>end</code> must be greater than or equal to <code>start</code>.
              The <code>end</code> value must not exceed the dashboard's <code>dimensions.rows</code>{" "}
              or <code>dimensions.cols</code> respectively.
            </p>
          </section>

          {/* PQL overview */}
          <section className="docs-section" id="pql-overview">
            <div className="docs-section-header">
              <p className="section-kicker">PQL</p>
              <h2>Overview</h2>
            </div>
            <p>
              Plot Query Language (PQL) is a SQL-inspired expression language for defining
              visualizations. Each card's <code>expr</code> field must be a valid PQL
              statement. The general syntax is:
            </p>
            <pre className="docs-code"><code>{`PLOT <function>(<args>)
FROM <table>
[WHERE <condition>]
[GROUP BY <column>]
[HAVING <condition>]
[ORDER BY <column> [ASC | DESC]]
[LIMIT <n> [OFFSET <n>]]`}</code></pre>
          </section>

          {/* Plot functions */}
          <section className="docs-section" id="plot-functions">
            <h2>Plot functions</h2>
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Function</th>
                  <th>Signature</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>BAR</code></td>
                  <td><code>BAR(category, value)</code></td>
                  <td>Grouped bar chart. <code>category</code> on the x-axis, <code>value</code> on the y-axis.</td>
                </tr>
                <tr>
                  <td><code>LINE</code></td>
                  <td><code>LINE(x, y)</code></td>
                  <td>Line chart for continuous or time-series data.</td>
                </tr>
                <tr>
                  <td><code>AREA</code></td>
                  <td><code>AREA(x, y)</code></td>
                  <td>Filled area chart. Same signature as LINE.</td>
                </tr>
                <tr>
                  <td><code>SCATTER</code></td>
                  <td><code>SCATTER(x, y)</code></td>
                  <td>Scatter plot for exploring correlation between two numeric columns.</td>
                </tr>
                <tr>
                  <td><code>PIE</code></td>
                  <td><code>PIE(category, value)</code></td>
                  <td>Pie chart showing proportional composition.</td>
                </tr>
                <tr>
                  <td><code>HISTOGRAM</code></td>
                  <td><code>HISTOGRAM(column [, bins])</code></td>
                  <td>Distribution histogram with an optional bin count.</td>
                </tr>
                <tr>
                  <td><code>HEATMAP</code></td>
                  <td><code>HEATMAP(x, y, value)</code></td>
                  <td>2D heatmap using x/y axes and a value column for intensity.</td>
                </tr>
              </tbody>
            </table>

            <div className="docs-examples">
              <pre className="docs-code"><code>{`-- Bar: sessions by traffic source
PLOT BAR(source, SUM(sessions)) FROM traffic GROUP BY source ORDER BY source ASC

-- Line: revenue trend over time
PLOT LINE(month, SUM(revenue)) FROM sales GROUP BY month ORDER BY month ASC LIMIT 12

-- Scatter: session quality correlation
PLOT SCATTER(avg_session_duration_sec, bounce_rate) FROM traffic WHERE sessions > 5000

-- Pie: revenue split by customer segment
PLOT PIE(segment, SUM(revenue)) FROM sales GROUP BY segment ORDER BY segment ASC`}</code></pre>
            </div>
          </section>

          {/* Aggregations */}
          <section className="docs-section" id="aggregations">
            <h2>Aggregations</h2>
            <p>
              Aggregation functions can be used as the value argument in plot functions.
              They are evaluated after <code>GROUP BY</code>.
            </p>
            <table className="docs-table">
              <thead>
                <tr><th>Function</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td><code>SUM(col)</code></td><td>Sum of all values in the group</td></tr>
                <tr><td><code>AVG(col)</code></td><td>Average (mean) of values in the group</td></tr>
                <tr><td><code>COUNT(col)</code></td><td>Count of non-null values in the group</td></tr>
                <tr><td><code>MIN(col)</code></td><td>Minimum value in the group</td></tr>
                <tr><td><code>MAX(col)</code></td><td>Maximum value in the group</td></tr>
              </tbody>
            </table>
          </section>

          {/* Clauses */}
          <section className="docs-section" id="clauses">
            <h2>Clauses</h2>

            <h3>WHERE</h3>
            <p>Filters rows before aggregation. Supports comparison, range, set, and pattern operators:</p>
            <pre className="docs-code"><code>{`WHERE revenue > 1000
WHERE status IN ('active', 'pending')
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'
WHERE name LIKE 'acme%'
WHERE revenue > 500 AND region = 'us-west'`}</code></pre>

            <h3>GROUP BY</h3>
            <p>Groups rows by the specified column before applying aggregations. Required when using aggregation functions.</p>
            <pre className="docs-code"><code>{`PLOT BAR(category, SUM(revenue)) FROM sales GROUP BY category`}</code></pre>

            <h3>HAVING</h3>
            <p>Filters groups after aggregation, similar to SQL <code>HAVING</code>:</p>
            <pre className="docs-code"><code>{`PLOT BAR(category, SUM(revenue)) FROM sales GROUP BY category HAVING SUM(revenue) > 10000`}</code></pre>

            <h3>ORDER BY</h3>
            <p>Sorts results. Defaults to ascending:</p>
            <pre className="docs-code"><code>{`ORDER BY revenue DESC
ORDER BY month ASC`}</code></pre>

            <h3>LIMIT / OFFSET</h3>
            <pre className="docs-code"><code>{`LIMIT 10
LIMIT 10 OFFSET 20`}</code></pre>
          </section>

          {/* parseDashboard */}
          <section className="docs-section" id="parse-dashboard">
            <div className="docs-section-header">
              <p className="section-kicker">API reference</p>
              <h2>parseDashboard()</h2>
            </div>
            <pre className="docs-code"><code>{`function parseDashboard(input: string): DashboardSpec`}</code></pre>
            <p>
              Parses a YAML string into a validated <code>DashboardSpec</code>. The function:
            </p>
            <ul className="docs-list">
              <li>Parses the YAML string and validates the document structure</li>
              <li>Validates all required fields and their types</li>
              <li>Parses each card's PQL <code>expr</code> via <code>pql-parser</code></li>
              <li>Validates card grid positions are within dashboard bounds</li>
              <li>Ensures all card <code>name</code> values are unique</li>
              <li>Throws <code>DashSpecParserError</code> on any failure, with a <code>path</code> pointing to the offending field</li>
            </ul>
            <pre className="docs-code"><code>{`import { parseDashboard, DashSpecParserError } from '@dash-spec/core';
import { readFileSync } from 'node:fs';

const yaml = readFileSync('./dashboard.yaml', 'utf8');

try {
  const spec = parseDashboard(yaml);
  console.log(spec.title);          // "Commerce overview"
  console.log(spec.dimensions);     // { rows: 6, cols: 12 }
  console.log(spec.cards.length);   // 4
} catch (error) {
  if (error instanceof DashSpecParserError) {
    console.error(\`Parse error at \${error.path}: \${error.message}\`);
  }
}`}</code></pre>
          </section>

          {/* Types */}
          <section className="docs-section" id="types">
            <h2>Types</h2>
            <pre className="docs-code"><code>{`type DashboardSpec = {
  name: string;
  title: string;
  description?: string;
  dimensions: DashboardDimensions;
  cards: DashboardCardSpec[];
};

type DashboardDimensions = {
  rows: number;
  cols: number;
};

type DashboardCardSpec = {
  name: string;
  title: string;
  description?: string;
  expr: string;          // original PQL string
  parsedExpr: PQLQuery;  // parsed AST from pql-parser
  pos: CardPosition;
};

type CardPosition = {
  rows: GridRange;
  cols: GridRange;
};

type GridRange = {
  start: number; // 1-based, inclusive
  end: number;   // 1-based, inclusive
};`}</code></pre>
          </section>

          {/* Errors */}
          <section className="docs-section" id="errors">
            <h2>Errors</h2>
            <pre className="docs-code"><code>{`class DashSpecError extends Error {}

class DashSpecParserError extends DashSpecError {
  readonly path?: string; // e.g. "cards[0].expr", "dimensions.rows"
}`}</code></pre>
            <p>
              <code>DashSpecParserError</code> is thrown by <code>parseDashboard()</code> for
              any structural, type, or PQL validation failure. The <code>path</code> property
              identifies which field caused the error using dot and bracket notation:
            </p>
            <table className="docs-table">
              <thead>
                <tr><th>Example path</th><th>Meaning</th></tr>
              </thead>
              <tbody>
                <tr><td><code>name</code></td><td>Top-level <code>name</code> field is missing or invalid</td></tr>
                <tr><td><code>dimensions.rows</code></td><td><code>rows</code> is not a positive integer</td></tr>
                <tr><td><code>cards[2].expr</code></td><td>PQL expression on the third card failed to parse</td></tr>
                <tr><td><code>cards[0].pos.cols</code></td><td>Column range on the first card exceeds grid bounds</td></tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </main>
  );
}
