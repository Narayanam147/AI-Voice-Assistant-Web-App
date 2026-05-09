import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
  conversationId: z.string().uuid().optional().nullable()
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
