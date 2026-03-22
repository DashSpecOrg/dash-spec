export class DashSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DashSpecError';
  }
}

export class DashSpecParserError extends DashSpecError {
  constructor(message: string) {
    super(message);
    this.name = 'DashSpecParserError';
  }
}
