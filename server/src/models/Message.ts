export type Message = {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
};

export const MessageModel = undefined;
