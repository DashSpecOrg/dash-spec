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
