import { Pool } from 'pg';
import type {
  BarPlotCall,
  ColumnMetadata,
  HavingCondition,
  HeatmapPlotCall,
  HistogramPlotCall,
  PiePlotCall,
  PQLQuery,
  PointPlotCall,
  WhereCondition
} from 'pql-parser/dist/types';

const databaseUrl = process.env.POSTGRES_DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/app';

const viewColumns: Record<string, string[]> = {
  dashboard_sales: [
    'order_id',
    'order_date',
    'month',
    'order_status',
    'customer_id',
    'customer_name',
    'region',
    'segment',
    'acquisition_channel',
    'product_id',
    'product_name',
    'category',
    'subcategory',
    'quantity',
    'unit_price',
    'revenue',
    'cost',
    'gross_profit'
  ],
  dashboard_traffic: [
    'traffic_date',
    'month',
    'source',
    'sessions',
    'page_views',
    'bounce_rate',
    'avg_session_duration_sec',
    'new_users'
  ],
  dashboard_support: [
    'ticket_id',
    'customer_id',
    'order_id',
    'category',
    'priority',
    'status',
    'created_at',
    'resolved_at',
    'satisfaction_score'
  ],
  dashboard_campaigns: [
    'campaign_id',
    'name',
    'channel',
    'start_date',
    'end_date',
    'budget',
    'impressions',
    'clicks',
    'conversions'
  ]
};

const supportedPlots = new Set(['BAR', 'LINE', 'AREA', 'SCATTER', 'PIE']);

let pool: Pool | undefined;

type QueryBuildResult = {
  text: string;
  values: Array<string | number | null>;
  fields: string[];
  plotFunction: string;
};

export type PostgresQueryResult = {
  rows: Record<string, unknown>[];
  sql: string;
  fields: string[];
  plotFunction: string;
};

function getPool(): Pool {
  pool ??= new Pool({
    connectionString: databaseUrl
  });

  return pool;
}

const sourceAliases: Record<string, string> = {
  sales: 'dashboard_sales',
  traffic: 'dashboard_traffic',
  support: 'dashboard_support',
  campaigns: 'dashboard_campaigns',
  dashboard_sales: 'dashboard_sales',
  dashboard_traffic: 'dashboard_traffic',
  dashboard_support: 'dashboard_support',
  dashboard_campaigns: 'dashboard_campaigns'
};

function detectSourceView(query: PQLQuery): string {
  const explicitSource = sourceAliases[query.fromClause.table];
  if (explicitSource) {
    return explicitSource;
  }

  const identifiers = new Set<string>();
  const pushColumn = (column?: ColumnMetadata) => {
    if (column?.column) {
      identifiers.add(column.column);
    }
  };

  switch (query.plotClause.plotFunction) {
    case 'BAR':
    case 'PIE': {
      const clause = query.plotClause as BarPlotCall | PiePlotCall;
      pushColumn(clause.categoriesColumn);
      pushColumn(clause.valuesColumn);
      break;
    }
    case 'LINE':
    case 'AREA':
    case 'SCATTER': {
      const clause = query.plotClause as PointPlotCall;
      pushColumn(clause.xColumn);
      pushColumn(clause.yColumn);
      break;
    }
    default:
      break;
  }

  if (query.groupKey) {
    identifiers.add(query.groupKey);
  }

  if (identifiers.has('source') || identifiers.has('sessions') || identifiers.has('bounce_rate')) {
    return 'dashboard_traffic';
  }

  if (identifiers.has('priority') || identifiers.has('satisfaction_score')) {
    return 'dashboard_support';
  }

  if (identifiers.has('channel') || identifiers.has('conversions') || identifiers.has('impressions')) {
    return 'dashboard_campaigns';
  }

  return 'dashboard_sales';
}

function quoteIdentifier(identifier: string, sourceView: string): string {
  if (!(viewColumns[sourceView] ?? []).includes(identifier)) {
    throw new Error(`Unsupported identifier "${identifier}" in demo query`);
  }

  return `"${identifier}"`;
}

function selectExpression(column: ColumnMetadata, alias: string, sourceView: string): string {
  if (column.aggregationFunction) {
    if (column.aggregationFunction === 'COUNT') {
      return `COUNT(*) AS "${alias}"`;
    }

    return `${column.aggregationFunction}(${quoteIdentifier(column.column ?? alias, sourceView)}) AS "${alias}"`;
  }

  return `${quoteIdentifier(column.column ?? alias, sourceView)} AS "${alias}"`;
}

function comparisonValue(
  value: string | number | null,
  values: Array<string | number | null>
): string {
  values.push(value);
  return `$${values.length}`;
}

function buildWhere(condition: WhereCondition, values: Array<string | number | null>, sourceView: string): string {
  if ('and' in condition) {
    return `(${condition.and.map((item) => buildWhere(item, values, sourceView)).join(' AND ')})`;
  }

  if ('or' in condition) {
    return `(${condition.or.map((item) => buildWhere(item, values, sourceView)).join(' OR ')})`;
  }

  if ('not' in condition) {
    return `(NOT ${buildWhere(condition.not, values, sourceView)})`;
  }

  if ('between' in condition) {
    const low = comparisonValue(condition.between.low, values);
    const high = comparisonValue(condition.between.high, values);
    return `(${quoteIdentifier(condition.between.key, sourceView)} BETWEEN ${low} AND ${high})`;
  }

  if ('in' in condition) {
    const placeholders = condition.in.values.map((value) => comparisonValue(value, values));
    return `(${quoteIdentifier(condition.in.key, sourceView)} IN (${placeholders.join(', ')}))`;
  }

  if ('like' in condition) {
    const placeholder = comparisonValue(condition.like.pattern, values);
    return `(${quoteIdentifier(condition.like.key, sourceView)} LIKE ${placeholder})`;
  }

  const [operator, payload] =
    'gt' in condition
      ? ['>', condition.gt]
      : 'gte' in condition
        ? ['>=', condition.gte]
        : 'lt' in condition
          ? ['<', condition.lt]
          : 'lte' in condition
            ? ['<=', condition.lte]
            : 'eq' in condition
              ? ['=', condition.eq]
              : ['!=', condition.neq];

  const placeholder = comparisonValue(payload.value, values);
  return `(${quoteIdentifier(payload.key, sourceView)} ${operator} ${placeholder})`;
}

function buildHaving(condition: HavingCondition, values: Array<string | number | null>, sourceView: string): string {
  if ('and' in condition) {
    return `(${condition.and.map((item) => buildHaving(item, values, sourceView)).join(' AND ')})`;
  }

  if ('or' in condition) {
    return `(${condition.or.map((item) => buildHaving(item, values, sourceView)).join(' OR ')})`;
  }

  const aggregation =
    condition.aggregation.function === 'COUNT'
      ? 'COUNT(*)'
      : `${condition.aggregation.function}(${quoteIdentifier(condition.aggregation.column ?? '', sourceView)})`;
  const placeholder = comparisonValue(condition.value, values);

  return `(${aggregation} ${condition.operator} ${placeholder})`;
}

function buildQuery(query: PQLQuery): QueryBuildResult {
  const values: Array<string | number | null> = [];
  const selects: string[] = [];
  const fields: string[] = [];
  const plotFunction = query.plotClause.plotFunction;
  const sourceView = detectSourceView(query);

  if (!supportedPlots.has(plotFunction)) {
    throw new Error(`Plot type ${plotFunction} is not supported in the demo yet`);
  }

  switch (plotFunction) {
    case 'BAR': {
      const clause = query.plotClause as BarPlotCall;
      selects.push(selectExpression(clause.categoriesColumn, 'category', sourceView));
      selects.push(selectExpression(clause.valuesColumn, 'value', sourceView));
      fields.push('category', 'value');
      break;
    }
    case 'PIE': {
      const clause = query.plotClause as PiePlotCall;
      selects.push(selectExpression(clause.categoriesColumn, 'category', sourceView));
      selects.push(selectExpression(clause.valuesColumn, 'value', sourceView));
      fields.push('category', 'value');
      break;
    }
    case 'LINE':
    case 'AREA':
    case 'SCATTER': {
      const clause = query.plotClause as PointPlotCall;
      selects.push(selectExpression(clause.xColumn, 'x', sourceView));
      selects.push(selectExpression(clause.yColumn, 'y', sourceView));
      fields.push('x', 'y');
      break;
    }
    case 'HISTOGRAM':
    case 'HEATMAP':
      throw new Error(`Plot type ${plotFunction} is not supported in the demo yet`);
    default:
      throw new Error(`Unsupported plot type ${(query.plotClause as HistogramPlotCall | HeatmapPlotCall).plotFunction}`);
  }

  const clauses = [`SELECT ${selects.join(', ')}`, `FROM "${sourceView}"`];

  if (query.whereCondition) {
    clauses.push(`WHERE ${buildWhere(query.whereCondition, values, sourceView)}`);
  }

  if (query.groupKey) {
    clauses.push(`GROUP BY ${quoteIdentifier(query.groupKey, sourceView)}`);
  }

  if (query.havingCondition) {
    clauses.push(`HAVING ${buildHaving(query.havingCondition, values, sourceView)}`);
  }

  if (query.orderBy) {
    const orderColumn = fields.includes(query.orderBy.column)
      ? `"${query.orderBy.column}"`
      : quoteIdentifier(query.orderBy.column, sourceView);
    clauses.push(`ORDER BY ${orderColumn} ${query.orderBy.direction}`);
  }

  if (query.limitAndOffset) {
    clauses.push(`LIMIT ${query.limitAndOffset.limit}`);
    if (query.limitAndOffset.offset > 0) {
      clauses.push(`OFFSET ${query.limitAndOffset.offset}`);
    }
  }

  return {
    text: clauses.join(' '),
    values,
    fields,
    plotFunction
  };
}

export async function runPostgresQuery(query: PQLQuery): Promise<PostgresQueryResult> {
  const built = buildQuery(query);
  const result = await getPool().query<Record<string, unknown>>(built.text, built.values);

  return {
    rows: result.rows,
    sql: built.text,
    fields: built.fields,
    plotFunction: built.plotFunction
  };
}
