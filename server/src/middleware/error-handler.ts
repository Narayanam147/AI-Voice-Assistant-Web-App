import type { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger';

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode ?? 500).json({
      message: err.message || 'Server error',
      details: err.details ?? null
    });
    return;
  }

  logger.error('Unhandled error', err);

  res.status(500).json({
    message: 'Server error',
    details: null
  });
};
