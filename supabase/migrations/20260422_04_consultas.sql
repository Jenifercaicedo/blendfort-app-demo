select id, nombre, residente, residente_principal_id
from public.proyectos
order by nombre;


select *
from public.v_proyecto_residentes_activos
order by proyecto_nombre, es_principal desc, residente_nombre;