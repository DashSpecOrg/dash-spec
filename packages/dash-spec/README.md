# @dash-spec/core

TypeScript library for parsing and validating YAML dashboard specifications. See the [root README](../../README.md) for full documentation.

## Install

```bash
npm install @dash-spec/core
```

## Usage

```ts
import { parseDashboard, DashSpecParserError } from '@dash-spec/core';

try {
  const spec = parseDashboard(yamlString);
  // spec: DashboardSpec
} catch (error) {
  if (error instanceof DashSpecParserError) {
    console.error(`[${error.path}] ${error.message}`);
  }
}
```

## Exports

- `parseDashboard(input: string): DashboardSpec` — parse and validate a YAML dashboard spec
- `DashboardSpec`, `DashboardCardSpec`, `DashboardDimensions`, `CardPosition`, `GridRange` — type definitions
- `DashSpecError`, `DashSpecParserError` — error classes
