import { Router } from 'express';

import { requireAuth } from '../../middleware/supabase-auth.middleware';
import { rateLimiter } from '../../middleware/rate-limiter';
import { validate } from '../../middleware/validate';
import { getConversationMessages, getConversations, postMessage, removeConversation, editMessage } from './chat.controller';
import { chatMessageSchema, editChatMessageSchema } from './chat.dto';

const router = Router();

router.get('/', requireAuth, getConversations);
router.get('/:id/messages', requireAuth, getConversationMessages);
router.delete('/:id', requireAuth, removeConversation);

router.post(
  '/message',
  requireAuth,
  rateLimiter,
  validate(chatMessageSchema),
  postMessage
);

router.post(
  '/message/:messageId/edit',
  requireAuth,
  rateLimiter,
  validate(editChatMessageSchema),
  editMessage
);

export default router;
