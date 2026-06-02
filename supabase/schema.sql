-- PickleSpace Database Schema
-- Run this in Supabase SQL Editor (Settings > SQL Editor)

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists pg_cron;      -- for releasing expired holds

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
create type user_role         as enum ('owner', 'player');
create type skill_level       as enum ('beginner', 'intermediate', 'advanced', 'open');
create type court_status      as enum ('active', 'inactive', 'pending');
create type slot_status       as enum ('available', 'held', 'booked');
create type booking_status    as enum ('pending', 'confirmed', 'cancelled', 'completed');
create type payment_status    as enum ('unpaid', 'paid', 'refunded');
create type payment_method    as enum ('gcash', 'card', 'cash');
create type game_status       as enum ('open', 'full', 'cancelled', 'completed');
create type game_player_status as enum ('joined', 'waitlisted', 'left');

-- ─────────────────────────────────────────────
-- USERS
-- Extends Supabase auth.users. Populated on first sign-in via trigger.
-- ─────────────────────────────────────────────
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  email         text not null,
  phone         text,
  role          user_role not null default 'player',
  skill_level   skill_level default 'beginner',   -- only meaningful for players
  avatar_url    text,
  created_at    timestamptz not null default now()
);

-- Auto-create profile row on auth signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- COURTS
-- ─────────────────────────────────────────────
create table public.courts (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references public.users(id) on delete cascade,
  name          text not null,
  description   text,
  address       text not null,
  city          text not null default 'Cebu City',
  province      text not null default 'Cebu',
  lat           numeric(9,6),
  lng           numeric(9,6),
  hourly_rate   numeric(10,2) not null,             -- in PHP
  amenities     text[] default '{}',                -- e.g. ['parking','shower','lights']
  images        text[] default '{}',                -- Supabase Storage URLs
  status        court_status not null default 'pending',
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- SLOTS
-- Each slot = one bookable time block on a court.
-- hold_expires_at is set when status = 'held' (10-min window).
-- ─────────────────────────────────────────────
create table public.slots (
  id               uuid primary key default uuid_generate_v4(),
  court_id         uuid not null references public.courts(id) on delete cascade,
  date             date not null,
  start_time       time not null,
  end_time         time not null,
  status           slot_status not null default 'available',
  held_by          uuid references public.users(id) on delete set null,
  hold_expires_at  timestamptz,
  created_at       timestamptz not null default now(),

  constraint slots_time_order check (end_time > start_time),
  constraint slots_no_overlap unique (court_id, date, start_time, end_time)
);

-- Index for fast availability queries
create index slots_court_date_idx on public.slots(court_id, date, status);
create index slots_hold_expiry_idx on public.slots(hold_expires_at) where status = 'held';

-- ─────────────────────────────────────────────
-- BOOKINGS
-- One booking = one slot, one player.
-- platform_fee = 10% of amount, paid to PickleSpace.
-- qr_code = unique token used for court check-in.
-- ─────────────────────────────────────────────
create table public.bookings (
  id                uuid primary key default uuid_generate_v4(),
  slot_id           uuid not null references public.slots(id) on delete restrict,
  player_id         uuid not null references public.users(id) on delete restrict,
  court_id          uuid not null references public.courts(id) on delete restrict,
  amount            numeric(10,2) not null,
  platform_fee      numeric(10,2) not null,          -- 10% of amount
  payment_status    payment_status not null default 'unpaid',
  payment_method    payment_method,
  paymongo_link_id  text,                            -- PayMongo payment link ID
  paymongo_payment_id text,                          -- set on webhook confirmation
  qr_code           text unique default uuid_generate_v4()::text, -- check-in token
  booking_status    booking_status not null default 'pending',
  notes             text,
  created_at        timestamptz not null default now()
);

create index bookings_player_idx  on public.bookings(player_id);
create index bookings_court_idx   on public.bookings(court_id);
create index bookings_slot_idx    on public.bookings(slot_id);

-- ─────────────────────────────────────────────
-- GAMES (Matchmaking Feed)
-- A player creates an open game on a booked slot.
-- Others can join up to max_players.
-- ─────────────────────────────────────────────
create table public.games (
  id              uuid primary key default uuid_generate_v4(),
  court_id        uuid not null references public.courts(id) on delete cascade,
  slot_id         uuid references public.slots(id) on delete set null,
  host_id         uuid not null references public.users(id) on delete cascade,
  title           text not null,
  description     text,
  skill_level     skill_level not null default 'open',
  max_players     int not null default 4 check (max_players between 2 and 20),
  current_players int not null default 1 check (current_players >= 1),
  status          game_status not null default 'open',
  created_at      timestamptz not null default now()
);

create index games_court_idx  on public.games(court_id);
create index games_status_idx on public.games(status);

-- ─────────────────────────────────────────────
-- GAME PLAYERS
-- Join table: who signed up for which game.
-- ─────────────────────────────────────────────
create table public.game_players (
  id         uuid primary key default uuid_generate_v4(),
  game_id    uuid not null references public.games(id) on delete cascade,
  player_id  uuid not null references public.users(id) on delete cascade,
  status     game_player_status not null default 'joined',
  joined_at  timestamptz not null default now(),

  unique (game_id, player_id)
);

create index game_players_game_idx   on public.game_players(game_id);
create index game_players_player_idx on public.game_players(player_id);

-- ─────────────────────────────────────────────
-- FUNCTION: Hold a slot for 10 minutes (atomic)
-- Returns the slot row on success, raises exception if unavailable.
-- ─────────────────────────────────────────────
create or replace function public.hold_slot(
  p_slot_id  uuid,
  p_user_id  uuid
)
returns public.slots language plpgsql as $$
declare
  v_slot public.slots;
begin
  -- Lock the row
  select * into v_slot
  from public.slots
  where id = p_slot_id
  for update;

  if not found then
    raise exception 'Slot not found';
  end if;

  -- Release expired hold
  if v_slot.status = 'held' and v_slot.hold_expires_at < now() then
    update public.slots
    set status = 'available', held_by = null, hold_expires_at = null
    where id = p_slot_id
    returning * into v_slot;
  end if;

  if v_slot.status <> 'available' then
    raise exception 'Slot is not available (status: %)', v_slot.status;
  end if;

  update public.slots
  set
    status          = 'held',
    held_by         = p_user_id,
    hold_expires_at = now() + interval '10 minutes'
  where id = p_slot_id
  returning * into v_slot;

  return v_slot;
end;
$$;

-- ─────────────────────────────────────────────
-- FUNCTION: Confirm booking (called after PayMongo webhook)
-- ─────────────────────────────────────────────
create or replace function public.confirm_booking(
  p_booking_id         uuid,
  p_paymongo_payment_id text
)
returns public.bookings language plpgsql security definer as $$
declare
  v_booking public.bookings;
begin
  update public.bookings
  set
    payment_status      = 'paid',
    booking_status      = 'confirmed',
    paymongo_payment_id = p_paymongo_payment_id
  where id = p_booking_id
    and payment_status = 'unpaid'
  returning * into v_booking;

  if not found then
    raise exception 'Booking not found or already confirmed';
  end if;

  -- Mark slot as booked
  update public.slots
  set status = 'booked', held_by = null, hold_expires_at = null
  where id = v_booking.slot_id;

  return v_booking;
end;
$$;

-- ─────────────────────────────────────────────
-- CRON: Release expired holds every minute
-- ─────────────────────────────────────────────
select cron.schedule(
  'release-expired-holds',
  '* * * * *',
  $$
    update public.slots
    set status = 'available', held_by = null, hold_expires_at = null
    where status = 'held'
      and hold_expires_at < now();
  $$
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table public.users         enable row level security;
alter table public.courts        enable row level security;
alter table public.slots         enable row level security;
alter table public.bookings      enable row level security;
alter table public.games         enable row level security;
alter table public.game_players  enable row level security;

-- USERS: see own profile; owners see players who booked their courts
create policy "users_select_own"   on public.users for select using (auth.uid() = id);
create policy "users_update_own"   on public.users for update using (auth.uid() = id);

-- COURTS: anyone can browse active courts; owners manage their own
create policy "courts_select_active" on public.courts for select
  using (status = 'active' or owner_id = auth.uid());
create policy "courts_insert_owner"  on public.courts for insert
  with check (owner_id = auth.uid());
create policy "courts_update_owner"  on public.courts for update
  using (owner_id = auth.uid());

-- SLOTS: anyone can read; owners insert their own court's slots
create policy "slots_select_all"     on public.slots for select using (true);
create policy "slots_insert_owner"   on public.slots for insert
  with check (
    exists (select 1 from public.courts where id = court_id and owner_id = auth.uid())
  );
create policy "slots_update_owner"   on public.slots for update
  using (
    exists (select 1 from public.courts where id = court_id and owner_id = auth.uid())
  );

-- BOOKINGS: players see own bookings; owners see bookings for their courts
create policy "bookings_select"  on public.bookings for select
  using (
    player_id = auth.uid()
    or exists (select 1 from public.courts where id = court_id and owner_id = auth.uid())
  );
create policy "bookings_insert"  on public.bookings for insert
  with check (player_id = auth.uid());

-- GAMES: public read; hosts manage own
create policy "games_select_all"   on public.games for select using (true);
create policy "games_insert_auth"  on public.games for insert with check (host_id = auth.uid());
create policy "games_update_host"  on public.games for update using (host_id = auth.uid());

-- GAME_PLAYERS: public read; players manage own row
create policy "gp_select_all"    on public.game_players for select using (true);
create policy "gp_insert_self"   on public.game_players for insert with check (player_id = auth.uid());
create policy "gp_delete_self"   on public.game_players for delete using (player_id = auth.uid());

-- ─────────────────────────────────────────────
-- REALTIME
-- Enable realtime for availability + matchmaking feed
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table public.slots;
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_players;
