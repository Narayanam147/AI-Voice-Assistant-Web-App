import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

import { ApiError } from './error-handler';

export const validate = (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(new ApiError('Invalid payload', 400, result.error.flatten()));
    }

    req.body = result.data;
    return next();
  };
