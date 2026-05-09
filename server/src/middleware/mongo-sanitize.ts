import type { NextFunction, Request, Response } from 'express';

const sanitizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record).reduce<Record<string, unknown>>((acc, key) => {
      const safeKey = key.replace(/[.$]/g, '_');
      acc[safeKey] = sanitizeValue(record[key]);
      return acc;
    }, {});
  }

  return value;
};

export const sanitizeRequest = () => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.body) {
      req.body = sanitizeValue(req.body);
    }

    if (req.params) {
      req.params = sanitizeValue(req.params) as any;
    }

    next();
  };
};
