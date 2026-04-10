-- =========================================================
-- 20260408_07_empleados_multiproyecto_base.sql
-- Objetivo:
--   Crear el nuevo modelo de personal multiproyecto
--   sin romper la tabla legacy `personal`.
--
-- Tablas nuevas:
--   - empleados
--   - empleado_proyecto
--
-- Reglas de negocio base:
--   - una fila por empleado en `empleados`
--   - una fila por asignación en `empleado_proyecto`
--   - proyectos relacionados por UUID
--   - valor_dia para personal de campo / operario
--   - salario_mensual para personal de oficina / residente
--   - valor_hora_extra general del empleado
-- =========================================================

-- =========================================================
-- 1) TABLA EMPLEADOS
-- =========================================================
create table if not exists public.empleados (
  id uuid primary key default gen_random_uuid(),

  nombre text not null,
  rol text not null default 'OPERARIO',
  cargo text,
  tipo text not null default 'CAMPO',

  -- Compensación general del empleado
  valor_dia numeric(12,2) not null default 0,
  salario_mensual numeric(12,2) not null default 0,
  valor_hora_extra numeric(12,2) not null default 0,

  fecha_contratacion date,
  estado_general text not null default 'ACTIVO',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint empleados_nombre_not_blank_chk
    check (length(trim(nombre)) > 0),

  constraint empleados_rol_valid_chk
    check (rol in ('OPERARIO', 'RESIDENTE', 'OFICINA')),

  constraint empleados_tipo_valid_chk
    check (tipo in ('CAMPO', 'OFICINA')),

  constraint empleados_valor_dia_nonnegative_chk
    check (valor_dia >= 0),

  constraint empleados_salario_mensual_nonnegative_chk
    check (salario_mensual >= 0),

  constraint empleados_valor_hora_extra_nonnegative_chk
    check (valor_hora_extra >= 0),

  constraint empleados_estado_general_valid_chk
    check (estado_general in ('ACTIVO', 'INACTIVO'))
);

-- Unicidad por nombre para simplificar transición desde `personal`
create unique index if not exists empleados_nombre_unique_idx
  on public.empleados (upper(trim(nombre)));

create index if not exists empleados_estado_general_idx
  on public.empleados (estado_general);

create index if not exists empleados_tipo_idx
  on public.empleados (tipo);

create index if not exists empleados_rol_idx
  on public.empleados (rol);

create index if not exists empleados_created_at_idx
  on public.empleados (created_at desc);

drop trigger if exists trg_empleados_updated_at on public.empleados;
create trigger trg_empleados_updated_at
before update on public.empleados
for each row
execute function public.set_updated_at();


-- =========================================================
-- 2) TABLA EMPLEADO_PROYECTO
-- =========================================================
create table if not exists public.empleado_proyecto (
  id uuid primary key default gen_random_uuid(),

  empleado_id uuid not null references public.empleados(id) on delete cascade,
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,

  -- Por ahora se permite heredar del empleado general.
  -- Si mañana quieres valores/cargo por proyecto, esta tabla ya está lista.
  cargo_en_proyecto text,
  rol_en_proyecto text,
  tipo_en_proyecto text,

  estado_asignacion text not null default 'ACTIVO',

  fecha_inicio date,
  fecha_fin date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint empleado_proyecto_estado_asignacion_valid_chk
    check (estado_asignacion in ('ACTIVO', 'INACTIVO')),

  constraint empleado_proyecto_tipo_valid_chk
    check (
      tipo_en_proyecto is null
      or tipo_en_proyecto in ('CAMPO', 'OFICINA')
    ),

  constraint empleado_proyecto_rol_valid_chk
    check (
      rol_en_proyecto is null
      or rol_en_proyecto in ('OPERARIO', 'RESIDENTE', 'OFICINA')
    ),

  constraint empleado_proyecto_unica_asignacion
    unique (empleado_id, proyecto_id)
);

create index if not exists empleado_proyecto_empleado_id_idx
  on public.empleado_proyecto (empleado_id);

create index if not exists empleado_proyecto_proyecto_id_idx
  on public.empleado_proyecto (proyecto_id);

create index if not exists empleado_proyecto_estado_idx
  on public.empleado_proyecto (estado_asignacion);

create index if not exists empleado_proyecto_created_at_idx
  on public.empleado_proyecto (created_at desc);

drop trigger if exists trg_empleado_proyecto_updated_at on public.empleado_proyecto;
create trigger trg_empleado_proyecto_updated_at
before update on public.empleado_proyecto
for each row
execute function public.set_updated_at();


-- =========================================================
-- 3) VIEW DE APOYO PARA TRANSICIÓN
-- =========================================================
create or replace view public.v_empleado_asignaciones as
select
  ep.id as asignacion_id,
  e.id as empleado_id,
  e.nombre,

  coalesce(ep.cargo_en_proyecto, e.cargo) as cargo,
  coalesce(ep.rol_en_proyecto, e.rol) as rol,
  coalesce(ep.tipo_en_proyecto, e.tipo) as tipo,

  p.id as proyecto_id,
  p.nombre as proyecto,

  e.valor_dia,
  e.salario_mensual,
  e.valor_hora_extra,
  e.fecha_contratacion,
  e.estado_general,
  ep.estado_asignacion,
  ep.fecha_inicio,
  ep.fecha_fin,

  e.created_at as empleado_created_at,
  ep.created_at as asignacion_created_at,
  e.updated_at as empleado_updated_at,
  ep.updated_at as asignacion_updated_at
from public.empleado_proyecto ep
join public.empleados e
  on e.id = ep.empleado_id
join public.proyectos p
  on p.id = ep.proyecto_id;


-- =========================================================
-- 4) RLS BASE
-- =========================================================

alter table public.empleados enable row level security;
alter table public.empleado_proyecto enable row level security;

drop policy if exists "empleados_select_admin_or_assigned_resident" on public.empleados;
drop policy if exists "empleados_insert_admin_only" on public.empleados;
drop policy if exists "empleados_update_admin_only" on public.empleados;
drop policy if exists "empleados_delete_admin_only" on public.empleados;

drop policy if exists "empleado_proyecto_select_admin_or_assigned_resident" on public.empleado_proyecto;
drop policy if exists "empleado_proyecto_insert_admin_only" on public.empleado_proyecto;
drop policy if exists "empleado_proyecto_update_admin_only" on public.empleado_proyecto;
drop policy if exists "empleado_proyecto_delete_admin_only" on public.empleado_proyecto;

-- EMPLEADOS
create policy "empleados_select_admin_or_assigned_resident"
on public.empleados
for select
to authenticated
using (
  public.current_role() = 'ADMIN'
  or (
    public.current_role() = 'RESIDENTE'
    and exists (
      select 1
      from public.empleado_proyecto ep
      join public.proyectos p on p.id = ep.proyecto_id
      where ep.empleado_id = empleados.id
        and (
          upper(trim(coalesce(p.residente, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
          or upper(trim(coalesce(public.current_nombre(), ''))) = any (
            select upper(trim(x))
            from unnest(coalesce(p.residentes, '{}'::text[])) as x
          )
        )
    )
  )
);

create policy "empleados_insert_admin_only"
on public.empleados
for insert
to authenticated
with check (
  public.current_role() = 'ADMIN'
);

create policy "empleados_update_admin_only"
on public.empleados
for update
to authenticated
using (
  public.current_role() = 'ADMIN'
)
with check (
  public.current_role() = 'ADMIN'
);

create policy "empleados_delete_admin_only"
on public.empleados
for delete
to authenticated
using (
  public.current_role() = 'ADMIN'
);

-- EMPLEADO_PROYECTO
create policy "empleado_proyecto_select_admin_or_assigned_resident"
on public.empleado_proyecto
for select
to authenticated
using (
  public.current_role() = 'ADMIN'
  or (
    public.current_role() = 'RESIDENTE'
    and exists (
      select 1
      from public.proyectos p
      where p.id = empleado_proyecto.proyecto_id
        and (
          upper(trim(coalesce(p.residente, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
          or upper(trim(coalesce(public.current_nombre(), ''))) = any (
            select upper(trim(x))
            from unnest(coalesce(p.residentes, '{}'::text[])) as x
          )
        )
    )
  )
);

create policy "empleado_proyecto_insert_admin_only"
on public.empleado_proyecto
for insert
to authenticated
with check (
  public.current_role() = 'ADMIN'
);

create policy "empleado_proyecto_update_admin_only"
on public.empleado_proyecto
for update
to authenticated
using (
  public.current_role() = 'ADMIN'
)
with check (
  public.current_role() = 'ADMIN'
);

create policy "empleado_proyecto_delete_admin_only"
on public.empleado_proyecto
for delete
to authenticated
using (
  public.current_role() = 'ADMIN'
);

-- =========================================================
-- 5) GRANTS BÁSICOS
-- =========================================================
grant all on table public.empleados to authenticated;
grant all on table public.empleado_proyecto to authenticated;
grant select on public.v_empleado_asignaciones to authenticated;