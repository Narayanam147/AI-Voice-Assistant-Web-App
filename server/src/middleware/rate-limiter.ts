import { NextFunction, Request, Response } from 'express';

const ipCache = new Map<string, { count: number; resetTime: number }>();
const LIMIT = 20; // Max 20 requests
const WINDOW_MS = 60 * 1000; // per 1 minute window

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  const record = ipCache.get(ip);
  
  if (!record) {
    ipCache.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return next();
  }
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + WINDOW_MS;
    return next();
  }
  
  record.count++;
  if (record.count > LIMIT) {
    return res.status(429).json({
      message: 'Too many requests. Please try again after a minute.'
    });
  }
  
  next();
};
