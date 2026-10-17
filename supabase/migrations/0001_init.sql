-- Budget Tracker: profiles, encrypted vaults, encrypted records

create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles: non-sensitive preferences only
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  currency   text not null default 'PHP',
  locale     text not null default 'en-PH',
  start_day  int  not null default 1 check (start_day between 1 and 28),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- vaults: wrapped data-encryption key only (never the raw key, passphrase, or recovery key)
create table if not exists public.vaults (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  wrapped_dek_pass     text  not null,
  wrapped_dek_recovery text  not null,
  salt_pass            text  not null,
  salt_recovery        text  not null,
  kdf                  text  not null,
  kdf_params           jsonb not null,
  v                    int   not null default 1,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger vaults_touch before update on public.vaults
  for each row execute function public.touch_updated_at();

-- records: one encrypted row per item. Only routing metadata is plaintext.
create table if not exists public.records (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  collection text not null check (collection in (
    'clients','incomes','payables','responsibilities','expenses',
    'savings','investments','wishlist','assets','netWorthHistory'
  )),
  month      text null check (month is null or month ~ '^\d{4}-\d{2}$'),
  payload    text not null,
  updated_at timestamptz not null,
  deleted    boolean not null default false,
  synced_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists records_user_collection_month on public.records (user_id, collection, month);
create index if not exists records_user_updated on public.records (user_id, updated_at);
create index if not exists records_user_synced on public.records (user_id, synced_at);

create or replace function public.touch_synced_at()
returns trigger
language plpgsql
as $$
begin
  new.synced_at = now();
  return new;
end;
$$;

create trigger records_touch before insert or update on public.records
  for each row execute function public.touch_synced_at();

-- Privileges: signed-in users only (RLS below limits them to their own rows)
revoke all on public.profiles, public.vaults, public.records from anon;
grant select, insert, update, delete on public.profiles, public.vaults, public.records to authenticated;

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.vaults   enable row level security;
alter table public.records  enable row level security;

create policy "profiles_select_own" on public.profiles for select using (user_id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert with check (user_id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles_delete_own" on public.profiles for delete using (user_id = auth.uid());

create policy "vaults_select_own" on public.vaults for select using (user_id = auth.uid());
create policy "vaults_insert_own" on public.vaults for insert with check (user_id = auth.uid());
create policy "vaults_update_own" on public.vaults for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "vaults_delete_own" on public.vaults for delete using (user_id = auth.uid());

create policy "records_select_own" on public.records for select using (user_id = auth.uid());
create policy "records_insert_own" on public.records for insert with check (user_id = auth.uid());
create policy "records_update_own" on public.records for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "records_delete_own" on public.records for delete using (user_id = auth.uid());

-- Create a profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Last-write-wins batch upsert. Runs as the caller, so RLS applies and user_id comes from the JWT.
create or replace function public.upsert_records(rows jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.records as r (user_id, id, collection, month, payload, updated_at, deleted)
  select auth.uid(), x.id, x.collection, x.month, x.payload, x.updated_at, coalesce(x.deleted, false)
  from jsonb_to_recordset(rows) as x(id text, collection text, month text, payload text, updated_at timestamptz, deleted boolean)
  on conflict (user_id, id) do update
    set collection = excluded.collection,
        month      = excluded.month,
        payload    = excluded.payload,
        updated_at = excluded.updated_at,
        deleted    = excluded.deleted
    where r.updated_at <= excluded.updated_at;
end;
$$;

grant execute on function public.upsert_records(jsonb) to authenticated;

-- Realtime for cross-device updates (payloads are ciphertext)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.records;
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;
