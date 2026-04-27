create extension if not exists unaccent;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.proyectos
  add column if not exists residente_principal_id uuid null references public.profiles(id) on delete set null;

create index if not exists idx_proyectos_residente_principal_id
  on public.proyectos (residente_principal_id);

update public.proyectos p
set residente_principal_id = pr.id
from public.profiles pr
where p.residente_principal_id is null
  and trim(coalesce(p.residente, '')) <> ''
  and upper(trim(unaccent(coalesce(pr.nombre, '')))) = upper(trim(unaccent(coalesce(p.residente, ''))));

create table if not exists public.proyecto_residentes (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  personal_id uuid null references public.personal(id) on delete set null,
  es_principal boolean not null default false,
  activo boolean not null default true,
  origen text not null default 'MANUAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_proyecto_residentes_proyecto_id
  on public.proyecto_residentes (proyecto_id);

create index if not exists idx_proyecto_residentes_profile_id
  on public.proyecto_residentes (profile_id);

create index if not exists idx_proyecto_residentes_personal_id
  on public.proyecto_residentes (personal_id);

create unique index if not exists uq_proyecto_residentes_activo
  on public.proyecto_residentes (proyecto_id, profile_id)
  where activo = true;

create unique index if not exists uq_proyecto_residente_principal_activo
  on public.proyecto_residentes (proyecto_id)
  where es_principal = true and activo = true;

drop trigger if exists trg_proyecto_residentes_updated_at on public.proyecto_residentes;
create trigger trg_proyecto_residentes_updated_at
before update on public.proyecto_residentes
for each row
execute function public.set_updated_at();

insert into public.proyecto_residentes (
  proyecto_id,
  profile_id,
  es_principal,
  activo,
  origen
)
select
  p.id,
  p.residente_principal_id,
  true,
  true,
  'BACKFILL_PRINCIPAL'
from public.proyectos p
where p.residente_principal_id is not null
  and not exists (
    select 1
    from public.proyecto_residentes pr
    where pr.proyecto_id = p.id
      and pr.profile_id = p.residente_principal_id
      and pr.activo = true
  );

create or replace view public.v_proyecto_residentes_activos as
select
  pr.id,
  pr.proyecto_id,
  p.nombre as proyecto_nombre,
  pr.profile_id,
  pf.nombre as residente_nombre,
  pr.personal_id,
  pe.nombre as personal_nombre,
  pr.es_principal,
  pr.activo,
  pr.origen,
  pr.created_at,
  pr.updated_at
from public.proyecto_residentes pr
join public.proyectos p on p.id = pr.proyecto_id
join public.profiles pf on pf.id = pr.profile_id
left join public.personal pe on pe.id = pr.personal_id
where pr.activo = true;

grant select on public.proyecto_residentes to anon, authenticated;
grant select on public.v_proyecto_residentes_activos to anon, authenticated;