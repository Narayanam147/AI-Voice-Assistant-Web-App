import Groq from 'groq-sdk';
import { env } from '../../config/env';
import { ApiError } from '../../middleware/error-handler';
import {
  createConversation,
  getConversation,
  getRecentMessages,
  insertMessage,
  updateConversationMessageCount,
} from './chat.repository';

let groq: Groq | null = null;

const getGroqClient = () => {
  if (!env.GROQ_API_KEY) {
    throw new ApiError('GROQ_API_KEY is not configured', 500);
  }

  if (!groq) {
    groq = new Groq({
      apiKey: env.GROQ_API_KEY,
    });
  }

  return groq;
};

type ChatInput = {
  userId: string;
  message: string;
  conversationId?: string;
};

type ChatResult = {
  conversationId: string;
  assistantMessageId: string;
  content: string;
  createdAt: Date;
};

const buildAssistantReply = async (
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
) => {
  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        'You are AVA, a helpful and friendly AI voice assistant. Your mission is to make life easy for users. Users can write any text or speak to you to find answers to their problems. Keep your responses concise and conversational.',
    },
    ...history.map((item) => ({ role: item.role, content: item.content })),
    { role: 'user', content: message },
  ];

  try {
    const model = 'llama-3.1-8b-instant'; // Updated to supported Groq model
    const completion = await getGroqClient().chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 150,
    });

    return completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw new ApiError('Failed to get response from AI', 502);
  }
};

export const createChatResponse = async ({
  userId,
  message,
  conversationId,
}: ChatInput): Promise<ChatResult> => {
  const nowIso = new Date().toISOString();
  let conversation = conversationId ? await getConversation(conversationId, userId) : null;

  if (conversationId && !conversation) {
    throw new ApiError('Conversation not found', 404);
  }

  if (!conversation) {
    const title = message.slice(0, 60).trim() || 'New Conversation';
    conversation = await createConversation(userId, title, nowIso);
  }

  if (!conversation) {
    throw new ApiError('Failed to initialize conversation', 500);
  }

  const conversationIdValue = conversation.id;

  await insertMessage(conversationIdValue, 'user', message);

  const history = await getRecentMessages(conversationIdValue, 10);
  const assistantContent = await buildAssistantReply(message, history);
  const assistantMessage = await insertMessage(
    conversationIdValue,
    'assistant',
    assistantContent
  );

  const messageCount = (conversation.message_count ?? 0) + 2;
  await updateConversationMessageCount(conversationIdValue, messageCount, nowIso);

  return {
    conversationId: conversationIdValue,
    assistantMessageId: assistantMessage.id,
    content: assistantContent,
    createdAt: new Date(assistantMessage.created_at),
  };
};
