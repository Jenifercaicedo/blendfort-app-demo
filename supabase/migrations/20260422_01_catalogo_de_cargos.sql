create extension if not exists pgcrypto;
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

-- =========================================================
-- 1) CATÁLOGO DE CARGOS
-- =========================================================
create table if not exists public.catalogo_cargos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  tipo_personal text not null default 'CAMPO',
  tipo_pago text not null default 'DIARIO',
  valor_dia numeric(12,2) not null default 0,
  valor_hora_extra numeric(12,2) not null default 0,
  salario_mensual numeric(12,2) not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogo_cargos_tipo_personal_chk
    check (tipo_personal in ('CAMPO', 'OFICINA', 'RESIDENTE', 'ADMINISTRATIVO')),
  constraint catalogo_cargos_tipo_pago_chk
    check (tipo_pago in ('DIARIO', 'MENSUAL', 'MIXTO'))
);

create unique index if not exists idx_catalogo_cargos_nombre_norm
  on public.catalogo_cargos ((upper(unaccent(nombre))));

drop trigger if exists trg_catalogo_cargos_updated_at on public.catalogo_cargos;
create trigger trg_catalogo_cargos_updated_at
before update on public.catalogo_cargos
for each row
execute function public.set_updated_at();

insert into public.catalogo_cargos
  (codigo, nombre, tipo_personal, tipo_pago, valor_dia, valor_hora_extra, salario_mensual, activo)
values
  ('MAESTRO', 'MAESTRO', 'CAMPO', 'DIARIO', 25, 5, 0, true),
  ('AYUDANTE', 'AYUDANTE', 'CAMPO', 'DIARIO', 0, 0, 0, true),
  ('OPERARIO', 'OPERARIO', 'CAMPO', 'DIARIO', 0, 0, 0, true),
  ('RESIDENTE_OBRA', 'RESIDENTE DE OBRA', 'RESIDENTE', 'MIXTO', 0, 0, 0, true),
  ('ARQUITECTA_RES', 'ARQUITECTA RESIDENTE', 'RESIDENTE', 'MIXTO', 0, 0, 0, true),
  ('ARQUITECTO_RES', 'ARQUITECTO RESIDENTE', 'RESIDENTE', 'MIXTO', 0, 0, 0, true),
  ('ING_RESIDENTE', 'INGENIERO RESIDENTE', 'RESIDENTE', 'MIXTO', 0, 0, 0, true),
  ('OFICINA_ADMIN', 'OFICINA ADMINISTRATIVA', 'OFICINA', 'MENSUAL', 0, 0, 0, true)
on conflict (codigo) do update
set
  nombre = excluded.nombre,
  tipo_personal = excluded.tipo_personal,
  tipo_pago = excluded.tipo_pago,
  valor_dia = excluded.valor_dia,
  valor_hora_extra = excluded.valor_hora_extra,
  salario_mensual = excluded.salario_mensual,
  activo = excluded.activo,
  updated_at = now();

-- =========================================================
-- 2) PERSONAL -> REFERENCIA A CATÁLOGO DE CARGOS
-- =========================================================
alter table public.personal
  add column if not exists cargo_catalogo_id uuid null references public.catalogo_cargos(id) on delete set null;

create index if not exists idx_personal_cargo_catalogo_id
  on public.personal (cargo_catalogo_id);

-- =========================================================
-- 3) PROYECTOS -> RESIDENTE PRINCIPAL POR ID
-- =========================================================
alter table public.proyectos
  add column if not exists residente_principal_id uuid null references public.profiles(id) on delete set null;

create index if not exists idx_proyectos_residente_principal_id
  on public.proyectos (residente_principal_id);

-- Backfill inicial desde proyectos.residente -> profiles.id
update public.proyectos p
set residente_principal_id = pr.id
from public.profiles pr
where p.residente_principal_id is null
  and trim(coalesce(p.residente, '')) <> ''
  and upper(unaccent(coalesce(pr.nombre, ''))) = upper(unaccent(coalesce(p.residente, '')));

-- =========================================================
-- 4) TABLA DE RESIDENTES POR PROYECTO
-- =========================================================
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

-- Backfill del residente principal actual a la tabla nueva
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

-- =========================================================
-- 5) VISTA AUXILIAR PARA REVISIÓN
-- =========================================================
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

grant select on public.catalogo_cargos to anon, authenticated;
grant select on public.proyecto_residentes to anon, authenticated;
grant select on public.v_proyecto_residentes_activos to anon, authenticated;