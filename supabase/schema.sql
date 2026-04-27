-- QFM Studio - Supabase SQL Schema
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
alter table if exists content enable row level security;
alter table if exists profiles enable row level security;

-- Profiles table (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  telegram text,
  phone text,
  kie_api_key text,
  updated_at timestamptz default now()
);

-- Content library
create table if not exists content (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null, -- image, video, ugc, storyboard
  prompt text not null,
  model text,
  aspect_ratio text,
  status text default 'pending', -- pending, processing, completed, failed
  result_url text,
  kie_task_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS policies
alter table profiles enable row level security;
alter table content enable row level security;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Users can view own content" on content
  for select using (auth.uid() = user_id);
create policy "Users can insert own content" on content
  for insert with check (auth.uid() = user_id);
create policy "Users can update own content" on content
  for update using (auth.uid() = user_id);
create policy "Users can delete own content" on content
  for delete using (auth.uid() = user_id);

-- Function to handle new user signups
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, updated_at)
  values (new.id, new.raw_user_meta_data->>'full_name', now());
  return new;
end;
$$;

-- Trigger on new user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
