-- =========================================================
-- 20260408_09_migrar_personal_a_empleados.sql
-- Objetivo:
--   Migrar datos desde la tabla legacy `personal`
--   hacia:
--   - empleados
--   - empleado_proyecto
-- =========================================================

-- 1) Insertar / consolidar empleados únicos por nombre
insert into public.empleados (
  nombre,
  rol,
  cargo,
  tipo,
  valor_dia,
  salario_mensual,
  valor_hora_extra,
  fecha_contratacion,
  estado_general
)
select
  upper(trim(p.nombre)) as nombre,
  coalesce(
    max(upper(trim(p.rol))) filter (where p.rol is not null and trim(p.rol) <> ''),
    'OPERARIO'
  ) as rol,
  max(upper(trim(p.cargo))) filter (where p.cargo is not null and trim(p.cargo) <> '') as cargo,
  coalesce(
    max(upper(trim(p.tipo))) filter (where p.tipo is not null and trim(p.tipo) <> ''),
    'CAMPO'
  ) as tipo,
  max(coalesce(p.valor_dia, 0)) as valor_dia,
  max(coalesce(p.salario_mensual, 0)) as salario_mensual,
  max(coalesce(p.valor_hora_extra, 0)) as valor_hora_extra,
  min(p.fecha_contratacion) as fecha_contratacion,
  case
    when bool_or(coalesce(upper(trim(p.estado)), 'ACTIVO') = 'ACTIVO') then 'ACTIVO'
    else 'INACTIVO'
  end as estado_general
from public.personal p
where trim(coalesce(p.nombre, '')) <> ''
group by upper(trim(p.nombre))
on conflict ((upper(trim(nombre))))
do update
set
  rol = excluded.rol,
  cargo = excluded.cargo,
  tipo = excluded.tipo,
  valor_dia = excluded.valor_dia,
  salario_mensual = excluded.salario_mensual,
  valor_hora_extra = excluded.valor_hora_extra,
  fecha_contratacion = coalesce(public.empleados.fecha_contratacion, excluded.fecha_contratacion),
  estado_general = excluded.estado_general,
  updated_at = now();

-- 2) Insertar asignaciones empleado-proyecto
insert into public.empleado_proyecto (
  empleado_id,
  proyecto_id,
  cargo_en_proyecto,
  rol_en_proyecto,
  tipo_en_proyecto,
  estado_asignacion,
  fecha_inicio
)
select
  e.id as empleado_id,
  pr.id as proyecto_id,
  upper(trim(p.cargo)) as cargo_en_proyecto,
  upper(trim(p.rol)) as rol_en_proyecto,
  upper(trim(p.tipo)) as tipo_en_proyecto,
  coalesce(upper(trim(p.estado)), 'ACTIVO') as estado_asignacion,
  p.fecha_contratacion as fecha_inicio
from public.personal p
join public.empleados e
  on upper(trim(e.nombre)) = upper(trim(p.nombre))
join public.proyectos pr
  on upper(trim(pr.nombre)) = upper(trim(p.proyecto))
where trim(coalesce(p.nombre, '')) <> ''
  and trim(coalesce(p.proyecto, '')) <> ''
on conflict (empleado_id, proyecto_id)
do update
set
  cargo_en_proyecto = excluded.cargo_en_proyecto,
  rol_en_proyecto = excluded.rol_en_proyecto,
  tipo_en_proyecto = excluded.tipo_en_proyecto,
  estado_asignacion = excluded.estado_asignacion,
  fecha_inicio = coalesce(public.empleado_proyecto.fecha_inicio, excluded.fecha_inicio),
  updated_at = now();