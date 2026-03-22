import { Lexer } from 'pql-parser/dist/lexer';
import { Parser as PqlParser } from 'pql-parser/dist/parser';
import { parse as parseYaml } from 'yaml';
import { DashSpecParserError } from './exceptions';
import { DashboardCardSpec, DashboardSpec, DashboardSpecInput, GridRange } from './types';

function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DashSpecParserError('expected an object', path);
  }

  return value as Record<string, unknown>;
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DashSpecParserError('expected a non-empty string', path);
  }

  return value;
}

function expectOptionalString(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return expectString(value, path);
}

function expectPositiveInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new DashSpecParserError('expected a positive integer', path);
  }

  return value;
}

function parseRange(value: unknown, path: string): GridRange {
  const record = expectRecord(value, path);
  const start = expectPositiveInteger(record.start, `${path}.start`);
  const end = expectPositiveInteger(record.end, `${path}.end`);

  if (start > end) {
    throw new DashSpecParserError('start must be less than or equal to end', path);
  }

  return { start, end };
}

function ensureWithinBounds(range: GridRange, max: number, path: string): void {
  if (range.end > max) {
    throw new DashSpecParserError(`range exceeds dashboard bounds (${max})`, path);
  }
}

function parseCard(
  value: unknown,
  index: number,
  dashboardRows: number,
  dashboardCols: number,
  usedNames: Set<string>
): DashboardCardSpec {
  const path = `cards[${index}]`;
  const record = expectRecord(value, path);
  const name = expectString(record.name, `${path}.name`);

  if (usedNames.has(name)) {
    throw new DashSpecParserError('card names must be unique', `${path}.name`);
  }

  usedNames.add(name);

  const title = expectString(record.title, `${path}.title`);
  const description = expectOptionalString(record.description, `${path}.description`);
  const expr = expectString(record.expr, `${path}.expr`);

  let parsedExpr;
  try {
    parsedExpr = new PqlParser(new Lexer(expr)).parse();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to parse PQL expression';
    throw new DashSpecParserError(message, `${path}.expr`);
  }

  const posRecord = expectRecord(record.pos, `${path}.pos`);
  const rows = parseRange(posRecord.rows, `${path}.pos.rows`);
  const cols = parseRange(posRecord.cols, `${path}.pos.cols`);

  ensureWithinBounds(rows, dashboardRows, `${path}.pos.rows`);
  ensureWithinBounds(cols, dashboardCols, `${path}.pos.cols`);

  return {
    name,
    title,
    description,
    expr,
    parsedExpr,
    pos: { rows, cols }
  };
}

export function parseDashboard(input: string): DashboardSpec {
  let parsed: unknown;

  try {
    parsed = parseYaml(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid YAML';
    throw new DashSpecParserError(message);
  }

  const root = expectRecord(parsed, 'dashboard') as DashboardSpecInput;
  const name = expectString(root.name, 'name');
  const title = expectString(root.title, 'title');
  const description = expectOptionalString(root.description, 'description');
  const dimensions = expectRecord(root.dimensions, 'dimensions');
  const rows = expectPositiveInteger(dimensions.rows, 'dimensions.rows');
  const cols = expectPositiveInteger(dimensions.cols, 'dimensions.cols');

  if (!Array.isArray(root.cards) || root.cards.length === 0) {
    throw new DashSpecParserError('expected a non-empty cards array', 'cards');
  }

  const usedNames = new Set<string>();
  const cards = root.cards.map((card, index) => parseCard(card, index, rows, cols, usedNames));

  return {
    name,
    title,
    description,
    dimensions: { rows, cols },
    cards
  };
}
