-- Supabase schema for VaizAI conversations and messages
-- Run this in Supabase SQL editor

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  message_count integer not null default 0,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key,
  email text,
  role text not null default 'user',
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id);

-- Optional helper function for incrementing message_count atomically
create or replace function public.increment_message_count(
  conversation_id uuid,
  increment_by integer,
  last_message_at_input timestamptz
) returns void language plpgsql as $$
begin
  update public.conversations
  set message_count = message_count + increment_by,
      last_message_at = last_message_at_input
  where id = conversation_id;
end;
$$;
