import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../../middleware/error-handler';

const notSupported = (_req: Request, _res: Response, next: NextFunction) => {
  return next(new ApiError('Auth is now handled by Supabase', 410));
};

export const register = notSupported;
export const login = notSupported;
export const refresh = notSupported;
