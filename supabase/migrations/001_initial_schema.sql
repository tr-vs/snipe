-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  display_name text not null default '',
  created_at timestamptz default now() not null
);

-- Games
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz default now() not null
);

-- Game members (users in a game + their score)
create table if not exists public.game_members (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  score integer not null default 0,
  joined_at timestamptz default now() not null,
  unique(game_id, user_id)
);

-- Snipes (each photo taken)
create table if not exists public.snipes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete cascade not null,
  sniper_id uuid references public.profiles(id) on delete cascade not null,
  photo_url text not null,
  created_at timestamptz default now() not null
);

-- Storage bucket for snipe photos
insert into storage.buckets (id, name, public)
values ('snipes', 'snipes', true)
on conflict do nothing;

-- Automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', '')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Increment sniper's score when a snipe is inserted
create or replace function public.handle_new_snipe()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.game_members
  set score = score + 1
  where game_id = new.game_id and user_id = new.sniper_id;
  return new;
end;
$$;

create or replace trigger on_snipe_created
  after insert on public.snipes
  for each row execute procedure public.handle_new_snipe();

-- RLS
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_members enable row level security;
alter table public.snipes enable row level security;

-- Profiles: viewable by all authenticated users, editable by owner
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

-- Games: viewable by members, creatable by authenticated users
create policy "games_select" on public.games for select to authenticated using (
  exists (select 1 from public.game_members where game_id = id and user_id = auth.uid())
  or created_by = auth.uid()
);
create policy "games_insert" on public.games for insert to authenticated with check (created_by = auth.uid());
create policy "games_update" on public.games for update to authenticated using (created_by = auth.uid());

-- Game members: viewable by game members, insertable by game creator or self (join)
create policy "game_members_select" on public.game_members for select to authenticated using (
  exists (select 1 from public.game_members gm where gm.game_id = game_id and gm.user_id = auth.uid())
);
create policy "game_members_insert" on public.game_members for insert to authenticated with check (
  exists (select 1 from public.games where id = game_id and created_by = auth.uid())
  or user_id = auth.uid()
);

-- Snipes: viewable by game members, insertable by game members
create policy "snipes_select" on public.snipes for select to authenticated using (
  exists (select 1 from public.game_members where game_id = snipes.game_id and user_id = auth.uid())
);
create policy "snipes_insert" on public.snipes for insert to authenticated with check (
  sniper_id = auth.uid()
  and exists (select 1 from public.game_members where game_id = snipes.game_id and user_id = auth.uid())
);

-- Storage: snipe photos readable by all, writable by authenticated users
create policy "snipes_storage_select" on storage.objects for select using (bucket_id = 'snipes');
create policy "snipes_storage_insert" on storage.objects for insert to authenticated with check (bucket_id = 'snipes');
