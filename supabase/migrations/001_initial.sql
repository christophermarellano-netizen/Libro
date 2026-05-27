-- Libro cloud sync schema

create table if not exists profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  local_id integer,
  title text not null,
  author text not null default '',
  cover_source text not null default 'epub',
  isbn text,
  page_count integer,
  print_type text,
  physical_height_mm double precision not null default 203,
  physical_width_mm double precision not null default 133,
  physical_thickness_mm double precision not null default 20,
  dimension_source text not null default 'default',
  spine_color_hex text not null default '#4a5568',
  spine_text_color_hex text not null default '#ffffff',
  preset_index integer,
  storage_path text not null,
  cover_path text not null,
  added_at bigint not null,
  last_opened_at bigint,
  updated_at bigint not null,
  unique (user_id, local_id)
);

create index if not exists books_user_id_idx on books (user_id);

create table if not exists reading_progress (
  book_id uuid primary key references books (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  cfi text not null,
  percentage double precision not null,
  updated_at bigint not null
);

create index if not exists reading_progress_user_id_idx on reading_progress (user_id);

create table if not exists bookmarks (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  cfi text not null,
  label text not null,
  percentage double precision not null,
  created_at bigint not null,
  unique (book_id, cfi)
);

create index if not exists bookmarks_user_id_idx on bookmarks (user_id);

create table if not exists vocab (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  word text not null,
  translation text not null,
  context text,
  added_at bigint not null
);

create index if not exists vocab_user_id_idx on vocab (user_id);

create table if not exists user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  deepl_api_key text,
  amazon_access_key text,
  amazon_secret_key text,
  amazon_partner_tag text,
  amazon_marketplace text,
  reader_font_size integer not null default 100,
  reader_font_family text not null default 'original',
  reader_theme text not null default 'light',
  reader_line_spacing double precision not null default 1.5,
  reader_margin integer not null default 16,
  reader_translation_enabled boolean not null default true,
  reading_time_date text,
  reading_time_today_ms bigint,
  library_sort text not null default 'recent',
  library_view text not null default 'grid',
  updated_at bigint not null
);

alter table profiles enable row level security;
alter table books enable row level security;
alter table reading_progress enable row level security;
alter table bookmarks enable row level security;
alter table vocab enable row level security;
alter table user_settings enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = user_id);

create policy "books_select_own" on books for select using (auth.uid() = user_id);
create policy "books_insert_own" on books for insert with check (auth.uid() = user_id);
create policy "books_update_own" on books for update using (auth.uid() = user_id);
create policy "books_delete_own" on books for delete using (auth.uid() = user_id);

create policy "progress_select_own" on reading_progress for select using (auth.uid() = user_id);
create policy "progress_insert_own" on reading_progress for insert with check (auth.uid() = user_id);
create policy "progress_update_own" on reading_progress for update using (auth.uid() = user_id);
create policy "progress_delete_own" on reading_progress for delete using (auth.uid() = user_id);

create policy "bookmarks_select_own" on bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks_insert_own" on bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks_update_own" on bookmarks for update using (auth.uid() = user_id);
create policy "bookmarks_delete_own" on bookmarks for delete using (auth.uid() = user_id);

create policy "vocab_select_own" on vocab for select using (auth.uid() = user_id);
create policy "vocab_insert_own" on vocab for insert with check (auth.uid() = user_id);
create policy "vocab_update_own" on vocab for update using (auth.uid() = user_id);
create policy "vocab_delete_own" on vocab for delete using (auth.uid() = user_id);

create policy "settings_select_own" on user_settings for select using (auth.uid() = user_id);
create policy "settings_insert_own" on user_settings for insert with check (auth.uid() = user_id);
create policy "settings_update_own" on user_settings for update using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('epubs', 'epubs', false)
on conflict (id) do nothing;

create policy "epubs_select_own"
on storage.objects for select
using (bucket_id = 'epubs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "epubs_insert_own"
on storage.objects for insert
with check (bucket_id = 'epubs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "epubs_update_own"
on storage.objects for update
using (bucket_id = 'epubs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "epubs_delete_own"
on storage.objects for delete
using (bucket_id = 'epubs' and auth.uid()::text = (storage.foldername(name))[1]);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id);
  insert into public.user_settings (user_id, updated_at) values (new.id, (extract(epoch from now()) * 1000)::bigint);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
