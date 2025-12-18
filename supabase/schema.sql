-- Supabase schema for AmigoChocolate
-- Run in SQL editor (SQL) in Supabase project

-- Enable UUID and cryptographic helpers
create extension if not exists "pgcrypto";

-- Names to be assigned (pool)
create table if not exists names (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Boxes (visual placeholders)
create table if not exists boxes (
  id uuid primary key default gen_random_uuid(),
  revealed_name text,
  locked boolean default false,
  created_at timestamptz default now()
);

-- Revelations log: who opened which box and which name was assigned
create table if not exists revelations (
  id uuid primary key default gen_random_uuid(),
  box_id uuid references boxes(id) on delete set null,
  name text,
  revealer_name text,
  revealer_phone text,
  created_at timestamptz default now()
);

-- RPC: atomic selection of a random name that hasn't been assigned yet
-- Returns JSON: { assigned_name: 'Name' } or { error: '...' }
create or replace function get_random_unrevealed_name(
  p_box_id uuid,
  p_revealer_name text,
  p_revealer_phone text
) returns json language plpgsql security definer as $$
declare
  v_assigned text;
begin
  -- prevent the same phone from revealing multiple times
  if exists (select 1 from revelations r where r.revealer_phone = p_revealer_phone) then
    return json_build_object('error', 'Este telefone já revelou uma vez');
  end if;

  -- pick a random name that is not present in revelations (not assigned yet)
  select n.name into v_assigned
  from names n
  where not exists (select 1 from revelations r where r.name = n.name)
  order by random()
  limit 1;

  if v_assigned is null then
    return json_build_object('error', 'Nenhum nome disponível');
  end if;

  -- persist revelation and mark box
  insert into revelations(box_id, name, revealer_name, revealer_phone)
    values (p_box_id, v_assigned, p_revealer_name, p_revealer_phone);

  update boxes set revealed_name = v_assigned, locked = true where id = p_box_id;

  return json_build_object('assigned_name', v_assigned);
end;
$$;

-- Helper: seed boxes equal to names count (optional)
-- INSERT INTO boxes DEFAULT VALUES; run as many times as needed or programmatically
