import { NextFunction, Request, Response } from 'express';

export const rateLimiter = async (_req: Request, _res: Response, next: NextFunction) => {
  next();
};
