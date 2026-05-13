import { ApiError } from '../../middleware/error-handler';
import { getSupabaseClient } from '../../config/supabase';

type ConversationRow = {
  id: string;
  user_id: string;
  title: string;
  message_count: number | null;
  last_message_at: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export const getConversation = async (conversationId: string, userId: string) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new ApiError('Failed to load conversation', 500);
  }

  return data as ConversationRow;
};

export const createConversation = async (userId: string, title: string, now: string) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      title,
      message_count: 0,
      last_message_at: now,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new ApiError('Failed to create conversation', 500);
  }

  return data as ConversationRow;
};

export const insertMessage = async (
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
    })
    .select('id, created_at')
    .single();

  if (error || !data) {
    throw new ApiError('Failed to save message', 500);
  }

  return data as Pick<MessageRow, 'id' | 'created_at'>;
};

export const updateConversationMessageCount = async (
  conversationId: string,
  messageCount: number,
  now: string
) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('conversations')
    .update({ message_count: messageCount, last_message_at: now })
    .eq('id', conversationId);

  if (error) {
    throw new ApiError('Failed to update conversation', 500);
  }
};

export const getRecentMessages = async (conversationId: string, limit = 10) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new ApiError('Failed to load messages', 500);
  }

  return data as Array<{ role: 'user' | 'assistant'; content: string }>;
};

export const getUserConversations = async (userId: string, limit = 20) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new ApiError('Failed to load conversations', 500);
  }

  return data as ConversationRow[];
};

export const deleteConversation = async (conversationId: string, userId: string) => {
  const supabase = getSupabaseClient();
  
  // 1. Delete associated messages first to prevent FK constraint violations
  const { error: msgError } = await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId);

  if (msgError) {
    console.error('[Chat Repository] Failed to delete messages:', msgError);
  }

  // 2. Delete the conversation itself
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId);

  if (error) {
    console.error('[Chat Repository] Failed to delete conversation:', error);
    throw new ApiError('Failed to delete conversation', 500);
  }
};
