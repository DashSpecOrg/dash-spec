<p align="center">
  <img src="docs/logo.png" alt="DashSpec" width="360" />
</p>

<p align="center">
  <strong>Declarative dashboard specifications powered by YAML and PQL.</strong><br/>
  Parse a YAML file once. Render a complete, typed analytics dashboard anywhere.
</p>


## What is DashSpec?

DashSpec is a TypeScript library (`@dash-spec/core`) that parses YAML dashboard specifications into fully validated, typed JavaScript objects. It gives analytics application teams a clean declarative contract for expressing dashboard structure, card layout, and visualization intent — decoupled from any specific rendering framework.

Each dashboard is defined in a single YAML file. Each card carries a **PQL** (Plot Query Language) expression that describes what to visualize and how. `parseDashboard()` validates the whole thing and returns a typed `DashboardSpec` you can render with any chart library.

```
YAML dashboard spec  →  parseDashboard()  →  DashboardSpec  →  your renderer
```


## Packages

| Package | Description |
|---|---|
| `packages/dash-spec` | `@dash-spec/core` — the YAML parser and type definitions |
| `apps/demo` | Next.js demo app that renders live dashboards from RustFS |
| [`pql-parser`](https://github.com/DashSpecOrg/pql-parser) | Sibling repo — the PQL lexer, parser, and AST types |


## Quick start

```ts
import { parseDashboard } from '@dash-spec/core';
import { readFileSync } from 'node:fs';

const yaml = readFileSync('./dashboard.yaml', 'utf8');
const spec = parseDashboard(yaml);

console.log(spec.title);           // "Commerce overview"
console.log(spec.dimensions);      // { rows: 6, cols: 12 }

for (const card of spec.cards) {
  console.log(card.name, card.pos);
  // card.parsedExpr holds the fully parsed PQL AST
}
```


## Dashboard YAML format

A dashboard spec is a single YAML document. Here is a complete example:

```yaml
name: commerce_overview
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
      cols: { start: 7, end: 12 }

  - name: segment_mix
    title: Revenue by segment
    expr: PLOT PIE(segment, SUM(revenue)) FROM sales GROUP BY segment ORDER BY segment ASC
    pos:
      rows: { start: 4, end: 6 }
      cols: { start: 1, end: 4 }

  - name: order_scatter
    title: Quantity vs. revenue
    expr: PLOT SCATTER(quantity, revenue) FROM sales WHERE revenue > 200 ORDER BY revenue DESC LIMIT 24
    pos:
      rows: { start: 4, end: 6 }
      cols: { start: 5, end: 12 }
```

### Top-level fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Unique machine-readable identifier |
| `title` | string | Yes | Human-readable display title |
| `description` | string | No | Optional subtitle or annotation |
| `dimensions.rows` | integer | Yes | Total rows in the layout grid |
| `dimensions.cols` | integer | Yes | Total columns in the layout grid |
| `cards` | Card[] | Yes | One or more card definitions |

### Card fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Unique identifier within the dashboard |
| `title` | string | Yes | Display title for the panel |
| `description` | string | No | Optional subtitle |
| `expr` | PQL string | Yes | Visualization expression (see PQL below) |
| `pos.rows` | `{ start, end }` | Yes | 1-based inclusive row range |
| `pos.cols` | `{ start, end }` | Yes | 1-based inclusive column range |

Grid positions are **1-based and inclusive**. Both `start` and `end` must be positive integers with `end >= start`, and neither may exceed the dashboard's declared `dimensions`.


## PQL — Plot Query Language

PQL is a SQL-inspired expression language for declaring visualizations. Every card's `expr` field must be a valid PQL statement.

### Syntax

```
PLOT <function>(<args>)
FROM <table>
[WHERE <condition>]
[GROUP BY <column>]
[HAVING <condition>]
[ORDER BY <column> [ASC | DESC]]
[LIMIT <n> [OFFSET <n>]]
```

### Plot functions

| Function | Signature | Description |
|---|---|---|
| `BAR` | `BAR(category, value)` | Grouped bar chart |
| `LINE` | `LINE(x, y)` | Line chart for continuous or time-series data |
| `AREA` | `AREA(x, y)` | Filled area chart |
| `SCATTER` | `SCATTER(x, y)` | Scatter plot for correlation analysis |
| `PIE` | `PIE(category, value)` | Proportional pie / donut chart |
| `HISTOGRAM` | `HISTOGRAM(column [, bins])` | Distribution histogram |
| `HEATMAP` | `HEATMAP(x, y, value)` | 2D heatmap |

### Aggregations

`SUM`, `AVG`, `COUNT`, `MIN`, `MAX` — used as the value argument and evaluated after `GROUP BY`.

```sql
PLOT BAR(category, SUM(revenue)) FROM sales GROUP BY category
PLOT LINE(month, AVG(bounce_rate)) FROM traffic GROUP BY month ORDER BY month ASC
```

### WHERE conditions

```sql
WHERE revenue > 1000
WHERE status IN ('active', 'pending')
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'
WHERE name LIKE 'acme%'
WHERE revenue > 500 AND region = 'us-west'
```


## API reference

### `parseDashboard(input: string): DashboardSpec`

Parses a YAML string into a validated `DashboardSpec`. Throws `DashSpecParserError` on any failure.

**Validation performed:**
- All required fields are present and correctly typed
- Card names are unique within the dashboard
- Each card's `expr` is a valid PQL expression
- Grid positions are within the declared `dimensions`

### Types

```ts
type DashboardSpec = {
  name: string;
  title: string;
  description?: string;
  dimensions: { rows: number; cols: number };
  cards: DashboardCardSpec[];
};

type DashboardCardSpec = {
  name: string;
  title: string;
  description?: string;
  expr: string;         // original PQL string
  parsedExpr: PQLQuery; // parsed AST from pql-parser
  pos: {
    rows: { start: number; end: number };
    cols: { start: number; end: number };
  };
};
```

### Error handling

```ts
import { parseDashboard, DashSpecParserError } from '@dash-spec/core';

try {
  const spec = parseDashboard(yaml);
} catch (error) {
  if (error instanceof DashSpecParserError) {
    // error.path points to the offending field, e.g. "cards[0].expr"
    console.error(`[${error.path}] ${error.message}`);
  }
}
```

`DashSpecParserError.path` uses dot and bracket notation to identify exactly where parsing failed:

| Example path | Meaning |
|---|---|
| `name` | Top-level `name` is missing or not a string |
| `dimensions.rows` | `rows` is not a positive integer |
| `cards[2].expr` | PQL expression on the third card is invalid |
| `cards[0].pos.cols` | Column range exceeds the grid bounds |


## Running the demo

The demo app renders live dashboards from a RustFS (S3-compatible) bucket and executes PQL queries against a Postgres database.

**Prerequisites:** Docker, Node.js 20+

```bash
# Start RustFS + Postgres
docker compose up -d

# Install workspace dependencies from the repo root
npm install

# Run the demo from the repo root
npm run dev
```

Then open [http://localhost:2026/demo](http://localhost:2026/demo).

Dashboard YAML files are loaded from `dashboards/` and automatically synced to the `dashspec` bucket on startup. Add or edit YAML files there to update the demo.


## Repository structure

```
.
├── apps/
│   └── demo/               # Next.js demo application
│       └── src/
│           ├── app/        # Pages, layout, and chart components
│           ├── lib/        # RustFS and Postgres client utilities
│           └── app/api/    # Dashboard listing and detail API routes
├── dashboards/             # Sample dashboard YAML files
├── packages/
│   └── dash-spec/          # @dash-spec/core library
│       └── src/
│           ├── index.ts
│           ├── parser.ts   # parseDashboard() implementation
│           ├── types.ts    # DashboardSpec and related types
│           └── exceptions.ts
└── docs/
    └── logo.png
```
