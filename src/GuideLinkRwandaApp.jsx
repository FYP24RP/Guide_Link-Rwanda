create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text unique not null,
  role text not null,
  password text default '1234',
  is_available boolean default true,
  headline text,
  location text default 'Kigali, Rwanda',
  rate_info text,
  photo text,
  degrees jsonb default '[]'::jsonb,
  services jsonb default '[]'::jsonb,
  experiences jsonb default '[]'::jsonb,
  skills jsonb default '[]'::jsonb,
  status text default 'approved',
  fee_paid integer default 500,
  momo_ref text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  agency text not null,
  location text not null,
  raw_pay numeric not null,
  pay text not null,
  date text not null,
  status text default 'open',
  assigned_to text,
  payment_status text default 'pending',
  owner_commission numeric,
  net_guide_payout numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists trip_requests (
  id uuid primary key default gen_random_uuid(),
  traveler_name text not null,
  traveler_contact text not null,
  preferred_category text not null,
  target_provider text not null,
  destination text not null,
  dates text not null,
  guests text not null,
  notes text,
  status text default 'pending_confirmation',
  confirmed_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
