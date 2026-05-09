import { createChatResponse } from './modules/chat/chat.service';
import { getSupabaseClient } from './config/supabase';

async function test() {
  try {
    // We need a valid UUID for a user. Let's fetch one from Supabase.
    const supabase = getSupabaseClient();
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error || !users || users.users.length === 0) {
      console.error('No users found or error fetching users', error);
      return;
    }
    
    const userId = users.users[0].id;
    console.log('Testing with user ID:', userId);
    
    const result = await createChatResponse({
      userId,
      message: 'Hello, testing the AI.'
    });
    
    console.log('Success!', result);
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();
