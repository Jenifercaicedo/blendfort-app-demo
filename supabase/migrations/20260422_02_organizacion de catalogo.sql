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

create table if not exists public.catalogo_cargos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  nombre_normalizado text,
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

alter table public.catalogo_cargos
  add column if not exists nombre_normalizado text;

create or replace function public.catalogo_cargos_set_nombre_normalizado()
returns trigger
language plpgsql
as $$
begin
  new.nombre_normalizado :=
    upper(trim(unaccent(coalesce(new.nombre, ''))));
  return new;
end;
$$;

drop trigger if exists trg_catalogo_cargos_nombre_normalizado on public.catalogo_cargos;
create trigger trg_catalogo_cargos_nombre_normalizado
before insert or update of nombre on public.catalogo_cargos
for each row
execute function public.catalogo_cargos_set_nombre_normalizado();

update public.catalogo_cargos
set nombre_normalizado = upper(trim(unaccent(coalesce(nombre, ''))))
where nombre_normalizado is null
   or nombre_normalizado <> upper(trim(unaccent(coalesce(nombre, ''))));

create unique index if not exists idx_catalogo_cargos_nombre_normalizado
  on public.catalogo_cargos (nombre_normalizado);

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

grant select on public.catalogo_cargos to anon, authenticated;