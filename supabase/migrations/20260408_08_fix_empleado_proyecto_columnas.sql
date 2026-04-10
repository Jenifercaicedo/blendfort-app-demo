-- =========================================================
-- 20260408_08_fix_empleado_proyecto_columnas.sql
-- Objetivo:
--   Alinear la tabla empleado_proyecto existente
--   con el nuevo diseño que usa:
--   - cargo_en_proyecto
--   - rol_en_proyecto
--   - tipo_en_proyecto
-- =========================================================

-- 1) Agregar nuevas columnas si no existen
alter table public.empleado_proyecto
add column if not exists cargo_en_proyecto text;

alter table public.empleado_proyecto
add column if not exists rol_en_proyecto text;

alter table public.empleado_proyecto
add column if not exists tipo_en_proyecto text;

-- 2) Migrar datos desde columnas viejas si existen
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'empleado_proyecto'
      and column_name = 'cargo'
  ) then
    execute '
      update public.empleado_proyecto
      set cargo_en_proyecto = coalesce(cargo_en_proyecto, cargo)
    ';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'empleado_proyecto'
      and column_name = 'rol'
  ) then
    execute '
      update public.empleado_proyecto
      set rol_en_proyecto = coalesce(rol_en_proyecto, rol)
    ';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'empleado_proyecto'
      and column_name = 'tipo'
  ) then
    execute '
      update public.empleado_proyecto
      set tipo_en_proyecto = coalesce(tipo_en_proyecto, tipo)
    ';
  end if;
end $$;

-- 3) Crear constraints nuevas si no existen
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'empleado_proyecto_tipo_valid_chk'
  ) then
    alter table public.empleado_proyecto
    add constraint empleado_proyecto_tipo_valid_chk
    check (
      tipo_en_proyecto is null
      or tipo_en_proyecto in ('CAMPO', 'OFICINA')
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'empleado_proyecto_rol_valid_chk'
  ) then
    alter table public.empleado_proyecto
    add constraint empleado_proyecto_rol_valid_chk
    check (
      rol_en_proyecto is null
      or rol_en_proyecto in ('OPERARIO', 'RESIDENTE', 'OFICINA')
    );
  end if;
end $$;

-- 4) Recrear la vista correcta
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