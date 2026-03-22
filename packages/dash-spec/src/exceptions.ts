export class DashSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DashSpecError';
  }
}

export class DashSpecParserError extends DashSpecError {
  readonly path?: string;

  constructor(message: string, path?: string) {
    super(path ? `${path}: ${message}` : message);
    this.name = 'DashSpecParserError';
    this.path = path;
  }
}
