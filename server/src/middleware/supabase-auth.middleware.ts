import type { NextFunction, Request, Response } from 'express';

import { getSupabaseClient } from '../config/supabase';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Missing Authorization header' });
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Invalid Authorization header' });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  req.user = {
    id: data.user.id,
    email: data.user.email ?? undefined,
  };

  return next();
};
