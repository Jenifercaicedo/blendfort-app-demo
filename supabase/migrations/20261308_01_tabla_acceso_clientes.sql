create extension if not exists pgcrypto;

create table if not exists public.cliente_accesos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  nombre_cliente text not null,
  codigo_acceso text not null unique,
  activo boolean not null default true,
  ultimo_ingreso_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cliente_accesos_proyecto_id
  on public.cliente_accesos (proyecto_id);

create or replace function public.set_updated_at_cliente_accesos()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cliente_accesos_updated_at on public.cliente_accesos;

create trigger trg_cliente_accesos_updated_at
before update on public.cliente_accesos
for each row
execute function public.set_updated_at_cliente_accesos();