import { DashSpecParserError } from './exceptions';
import { DashboardSpec } from './types';

export function parseDashboard(_input: string): DashboardSpec {
  throw new DashSpecParserError('parseDashboard is not implemented yet.');
}
