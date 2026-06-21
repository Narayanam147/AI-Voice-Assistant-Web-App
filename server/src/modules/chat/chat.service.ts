import Groq from 'groq-sdk';
import { env } from '../../config/env';
import { ApiError } from '../../middleware/error-handler';
import {
  createConversation,
  getConversation,
  getRecentMessages,
  insertMessage,
  updateConversationMessageCount,
  getMessage,
  updateMessageContent,
  deleteMessagesAfter,
  getMessageCount,
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
  userName?: string;
};

type ChatResult = {
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  content: string;
  createdAt: Date;
};

const buildAssistantReply = async (
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  userName?: string
) => {
  const userGreeting = userName ? `The user's name is ${userName}.` : '';
  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        `You are AVA, a highly capable, proactive, and friendly AI voice assistant. Your mission is to make life easy for users. ${userGreeting} 
        
CRITICAL BEHAVIOR:
1. If the user's request is vague, brief, or missing important details (e.g., "Write an email", "Fix this code"), DO NOT just guess or provide a generic response.
2. Instead, proactively ask 1-2 short, clarifying questions to gather the necessary context before completing the task. 
3. Engage in a natural back-and-forth conversation.
4. Keep all your responses concise, conversational, and easy to listen to, as they are often spoken aloud to the user.`,
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
      max_tokens: 1024,
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
  userName,
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

  const userMessage = await insertMessage(conversationIdValue, 'user', message);

  const history = (await getRecentMessages(conversationIdValue, 10)).reverse();
  const assistantContent = await buildAssistantReply(message, history, userName);
  const assistantMessage = await insertMessage(
    conversationIdValue,
    'assistant',
    assistantContent
  );

  const messageCount = (conversation.message_count ?? 0) + 2;
  await updateConversationMessageCount(conversationIdValue, messageCount, nowIso);

  return {
    conversationId: conversationIdValue,
    userMessageId: userMessage.id,
    assistantMessageId: assistantMessage.id,
    content: assistantContent,
    createdAt: new Date(assistantMessage.created_at),
  };
};

export const editAndRegenerateChatResponse = async ({
  userId,
  messageId,
  newMessage,
  userName,
}: {
  userId: string;
  messageId: string;
  newMessage: string;
  userName?: string;
}): Promise<ChatResult> => {
  const nowIso = new Date().toISOString();
  
  // 1. Get the message and verify ownership
  const message = await getMessage(messageId);
  const conversationId = message.conversation_id;
  
  // Verify conversation ownership
  const conversation = await getConversation(conversationId, userId);
  if (!conversation) {
    throw new ApiError('Conversation not found or unauthorized', 404);
  }
  
  if (message.role !== 'user') {
    throw new ApiError('Cannot edit an assistant message', 400);
  }

  // 2. Delete all newer messages in this conversation (the subsequent user messages and assistant replies)
  await deleteMessagesAfter(conversationId, message.created_at);

  // 3. Update the content of the user message
  await updateMessageContent(messageId, newMessage);

  // 4. Retrieve recent history up to this updated message (which is now the last message in DB)
  const history = (await getRecentMessages(conversationId, 10)).reverse();
  
  // 5. Generate a new assistant reply
  const assistantContent = await buildAssistantReply(newMessage, history, userName);
  
  // 6. Insert new assistant reply
  const assistantMessage = await insertMessage(
    conversationId,
    'assistant',
    assistantContent
  );

  // 7. Recount messages and update conversation state
  const messageCount = await getMessageCount(conversationId);
  await updateConversationMessageCount(conversationId, messageCount, nowIso);

  return {
    conversationId,
    userMessageId: messageId,
    assistantMessageId: assistantMessage.id,
    content: assistantContent,
    createdAt: new Date(assistantMessage.created_at),
  };
};
