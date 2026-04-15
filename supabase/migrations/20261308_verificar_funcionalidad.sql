select
  ca.id,
  ca.nombre_cliente,
  ca.codigo_acceso,
  ca.activo,
  p.nombre as proyecto
from public.cliente_accesos ca
join public.proyectos p on p.id = ca.proyecto_id
order by ca.created_at desc;