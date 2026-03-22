import type { PQLQuery } from 'pql-parser/dist/types';

export type GridRange = {
  start: number;
  end: number;
};

export type CardPosition = {
  rows: GridRange;
  cols: GridRange;
};

export type DashboardCardSpec = {
  name: string;
  title: string;
  description?: string;
  expr: string;
  parsedExpr: PQLQuery;
  pos: CardPosition;
};

export type DashboardDimensions = {
  rows: number;
  cols: number;
};

export type DashboardSpec = {
  name: string;
  title: string;
  description?: string;
  dimensions: DashboardDimensions;
  cards: DashboardCardSpec[];
};

export type DashboardSpecInput = {
  name: unknown;
  title: unknown;
  description?: unknown;
  dimensions: {
    rows: unknown;
    cols: unknown;
  };
  cards: Array<{
    name: unknown;
    title: unknown;
    description?: unknown;
    expr: unknown;
    pos: {
      rows: {
        start: unknown;
        end: unknown;
      };
      cols: {
        start: unknown;
        end: unknown;
      };
    };
  }>;
};
