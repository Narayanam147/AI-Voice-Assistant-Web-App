import { Router } from 'express';

import { requireAuth } from '../../middleware/supabase-auth.middleware';
import { rateLimiter } from '../../middleware/rate-limiter';
import { validate } from '../../middleware/validate';
import { getConversations, postMessage } from './chat.controller';
import { chatMessageSchema } from './chat.dto';

const router = Router();

router.get('/', requireAuth, getConversations);

router.post(
  '/message',
  requireAuth,
  rateLimiter,
  validate(chatMessageSchema),
  postMessage
);

export default router;
