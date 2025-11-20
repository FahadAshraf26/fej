export class PlanError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = "PlanError";
    this.statusCode = statusCode;
  }
}
