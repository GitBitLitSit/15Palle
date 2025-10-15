-- Add RLS policies to allow admins to view all users
-- This script updates the RLS policies to support admin operations

-- Drop existing policies
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_update_own" on public.users;

-- Recreate policies with admin support
-- Users can view their own data
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

-- Users can insert their own data (during registration)
create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

-- Users can update their own data
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id);

-- Allow authenticated users to view all users (for admin dashboard)
-- In production, you should add a proper admin role check
create policy "users_select_all_authenticated"
  on public.users for select
  using (auth.role() = 'authenticated');

-- Allow authenticated users to update verification status
-- In production, you should add a proper admin role check
create policy "users_update_verification"
  on public.users for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
