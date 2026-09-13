-- ZenTrip Phase-1 schema
-- Apply in Supabase SQL editor or migration tooling.

create extension if not exists "pgcrypto";

create table if not exists public.trips (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  destination_summary text not null,
  start_date date,
  end_date date,
  duration integer not null default 1,
  budget numeric(12,2) not null default 0,
  travelers integer not null default 1,
  status text not null default 'draft',
  confidence_score integer not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  preferences_json jsonb not null default '{}'::jsonb,
  final_itinerary_json jsonb not null default '[]'::jsonb,
  raw_agent_outputs jsonb not null default '{}'::jsonb,
  weather_snapshots_json jsonb not null default '[]'::jsonb,
  local_experiences_json jsonb not null default '[]'::jsonb,
  budget_breakdown_json jsonb not null default '{}'::jsonb,
  route_json jsonb not null default '{}'::jsonb,
  sharing_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trips_user_id_created_at on public.trips(user_id, created_at desc);
create index if not exists idx_trips_status on public.trips(status);

create table if not exists public.trip_preferences (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_trip_preferences_trip_id on public.trip_preferences(trip_id);

create table if not exists public.trip_companions (
  id text not null,
  trip_id text not null references public.trips(id) on delete cascade,
  name text not null,
  preferences jsonb not null default '{}'::jsonb,
  votes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (trip_id, id)
);

create table if not exists public.trip_agents (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  agent_id text not null,
  name text not null,
  status text not null,
  progress integer not null default 0,
  output_summary text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_trip_agents_trip_agent on public.trip_agents(trip_id, agent_id);

create table if not exists public.trip_activities (
  id text not null,
  trip_id text not null references public.trips(id) on delete cascade,
  day integer,
  activity jsonb not null,
  created_at timestamptz not null default now(),
  primary key (trip_id, id)
);

create table if not exists public.trip_stays (
  id text not null,
  trip_id text not null references public.trips(id) on delete cascade,
  stay jsonb not null,
  created_at timestamptz not null default now(),
  primary key (trip_id, id)
);

create table if not exists public.trip_routes (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null unique references public.trips(id) on delete cascade,
  route jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_budget_items (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  category text not null,
  label text not null,
  amount numeric(12,2) not null default 0,
  currency text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_events (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_memory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  learned_traits jsonb not null default '[]'::jsonb,
  likes jsonb not null default '[]'::jsonb,
  dislikes jsonb not null default '[]'::jsonb,
  past_destinations jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.shared_links (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  slug text not null unique,
  access_level text not null default 'view',
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  export_type text not null,
  status text not null default 'queued',
  file_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS and basic owner policies.
alter table public.trips enable row level security;
alter table public.trip_preferences enable row level security;
alter table public.trip_companions enable row level security;
alter table public.trip_agents enable row level security;
alter table public.trip_activities enable row level security;
alter table public.trip_stays enable row level security;
alter table public.trip_routes enable row level security;
alter table public.trip_budget_items enable row level security;
alter table public.trip_weather_snapshots enable row level security;
alter table public.trip_events enable row level security;
alter table public.saved_locations enable row level security;
alter table public.user_memory enable row level security;
alter table public.shared_links enable row level security;
alter table public.exports enable row level security;

create policy if not exists trips_owner_all on public.trips
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists trip_preferences_owner_all on public.trip_preferences
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy if not exists trip_companions_owner_all on public.trip_companions
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy if not exists trip_agents_owner_all on public.trip_agents
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy if not exists trip_activities_owner_all on public.trip_activities
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy if not exists trip_stays_owner_all on public.trip_stays
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy if not exists trip_routes_owner_all on public.trip_routes
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy if not exists trip_budget_items_owner_all on public.trip_budget_items
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy if not exists trip_weather_snapshots_owner_all on public.trip_weather_snapshots
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy if not exists trip_events_owner_all on public.trip_events
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy if not exists shared_links_owner_all on public.shared_links
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy if not exists exports_owner_all on public.exports
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy if not exists saved_locations_owner_all on public.saved_locations
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists user_memory_owner_all on public.user_memory
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
