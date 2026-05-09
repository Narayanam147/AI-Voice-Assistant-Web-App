import type { NextFunction, Request, Response } from 'express';

import { createChatResponse } from './chat.service';
import { getUserConversations } from './chat.repository';

export const postMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { message, conversationId } = req.body as {
      message: string;
      conversationId?: string | null;
    };

    console.log(`[Chat] User ${req.user.id} sending: "${message.slice(0, 50)}..."`);

    const result = await createChatResponse({
      userId: req.user.id,
      message,
      conversationId: conversationId || undefined
    });

    console.log(`[Chat] Response generated, conversation: ${result.conversationId}`);

    return res.status(200).json({
      conversationId: result.conversationId,
      id: result.assistantMessageId,
      role: 'assistant',
      content: result.content,
      createdAt: result.createdAt
    });
  } catch (err: any) {
    console.error('[Chat] Error in postMessage:', err?.message || err);
    return next(err);
  }
};

export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const conversations = await getUserConversations(req.user.id);
    return res.status(200).json(conversations);
  } catch (err: any) {
    console.error('[Chat] Error in getConversations:', err?.message || err);
    return next(err);
  }
};
