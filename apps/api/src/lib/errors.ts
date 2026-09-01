export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const badRequest = (message: string) => new AppError(400, "BAD_REQUEST", message);
export const notFound = (message = "Not found") => new AppError(404, "NOT_FOUND", message);
export const forbidden = (message = "Forbidden") => new AppError(403, "FORBIDDEN", message);
export const unauthorized = (message = "Unauthorized") => new AppError(401, "UNAUTHORIZED", message);
export const conflict = (message: string) => new AppError(409, "CONFLICT", message);
