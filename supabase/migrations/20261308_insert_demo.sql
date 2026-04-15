2026insert into public.cliente_accesos (
  proyecto_id,
  nombre_cliente,
  codigo_acceso,
  activo
)
select
  p.id,
  'CLIENTE DEMO',
  'BLEND-CLIENTE-001',
  true
from public.proyectos p
where upper(trim(p.nombre)) = upper(trim('CUBIERTA PEGUCHE'))
limit 1;