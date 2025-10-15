-- Create users table with all required fields for registration
-- This table references auth.users and stores additional user information

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text not null,
  address text not null,
  date_of_birth date not null,
  country text not null,
  city text not null,
  zip text not null,
  cp text not null,
  privacy_accepted boolean not null default false,
  is_verified boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.users enable row level security;

-- Policy: Users can view their own data
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

-- Policy: Users can insert their own data (during registration)
create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

-- Policy: Users can update their own data
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id);

-- Policy: Allow admins to view all users (we'll use service role for admin operations)
-- This will be handled via server-side code with elevated permissions

-- Create index for faster queries
create index if not exists users_email_idx on public.users(email);
create index if not exists users_is_verified_idx on public.users(is_verified);
create index if not exists users_created_at_idx on public.users(created_at desc);

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Create trigger to automatically update updated_at
drop trigger if exists set_updated_at on public.users;
create trigger set_updated_at
  before update on public.users
  for each row
  execute function public.handle_updated_at();
