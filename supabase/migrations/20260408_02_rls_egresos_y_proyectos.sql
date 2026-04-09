-- =========================================================
-- 20260408_02_rls_egresos_y_proyectos.sql
-- Objetivo:
--   Endurecer RLS de proyectos y egresos.
--   - ADMIN: acceso total
--   - RESIDENTE: acceso limitado a sus proyectos y sus egresos
-- =========================================================

-- =========================================================
-- PROYECTOS
-- =========================================================

-- Eliminar políticas abiertas anteriores
drop policy if exists "proyectos_select_authenticated" on public.proyectos;
drop policy if exists "proyectos_insert_authenticated" on public.proyectos;
drop policy if exists "proyectos_update_authenticated" on public.proyectos;
drop policy if exists "proyectos_delete_authenticated" on public.proyectos;

-- SELECT:
-- ADMIN ve todo
-- RESIDENTE solo ve proyectos donde:
--   - proyectos.residente = su nombre actual
--   - o está incluido en proyectos.residentes[]
create policy "proyectos_select_admin_or_assigned_resident"
on public.proyectos
for select
to authenticated
using (
  public.current_role() = 'ADMIN'
  or (
    public.current_role() = 'RESIDENTE'
    and (
      upper(trim(coalesce(residente, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
      or upper(trim(coalesce(public.current_nombre(), ''))) = any (
        select upper(trim(x))
        from unnest(coalesce(residentes, '{}'::text[])) as x
      )
    )
  )
);

-- INSERT:
-- solo ADMIN
create policy "proyectos_insert_admin_only"
on public.proyectos
for insert
to authenticated
with check (
  public.current_role() = 'ADMIN'
);

-- UPDATE:
-- solo ADMIN
create policy "proyectos_update_admin_only"
on public.proyectos
for update
to authenticated
using (
  public.current_role() = 'ADMIN'
)
with check (
  public.current_role() = 'ADMIN'
);

-- DELETE:
-- solo ADMIN
create policy "proyectos_delete_admin_only"
on public.proyectos
for delete
to authenticated
using (
  public.current_role() = 'ADMIN'
);

-- =========================================================
-- EGRESOS
-- =========================================================

-- Eliminar políticas abiertas anteriores
drop policy if exists "egresos_select_authenticated" on public.egresos;
drop policy if exists "egresos_insert_authenticated" on public.egresos;
drop policy if exists "egresos_update_authenticated" on public.egresos;
drop policy if exists "egresos_delete_authenticated" on public.egresos;

drop policy if exists "egresos_delete_admin_or_owner" on public.egresos;
drop policy if exists "egresos_insert_admin_or_residente_assigned" on public.egresos;
drop policy if exists "egresos_select_admin_or_assigned" on public.egresos;
drop policy if exists "egresos_update_admin_or_owner" on public.egresos;

-- SELECT:
-- ADMIN ve todo
-- RESIDENTE ve egresos cuando:
--   - el egreso.residente coincide con su nombre
--   - o el proyecto del egreso está asignado a ese residente
create policy "egresos_select_admin_or_assigned_resident"
on public.egresos
for select
to authenticated
using (
  public.current_role() = 'ADMIN'
  or (
    public.current_role() = 'RESIDENTE'
    and (
      upper(trim(coalesce(residente, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
      or exists (
        select 1
        from public.proyectos p
        where upper(trim(coalesce(p.nombre, ''))) = upper(trim(coalesce(egresos.proyecto, '')))
          and (
            upper(trim(coalesce(p.residente, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
            or upper(trim(coalesce(public.current_nombre(), ''))) = any (
              select upper(trim(x))
              from unnest(coalesce(p.residentes, '{}'::text[])) as x
            )
          )
      )
    )
  )
);

-- INSERT:
-- ADMIN puede insertar cualquier egreso
-- RESIDENTE puede insertar solo si:
--   - creado_por = su nombre actual
--   - creado_por_rol = RESIDENTE
--   - residente = su nombre actual
--   - y el proyecto está asignado a ese residente
create policy "egresos_insert_admin_or_residente_assigned"
on public.egresos
for insert
to authenticated
with check (
  public.current_role() = 'ADMIN'
  or (
    public.current_role() = 'RESIDENTE'
    and upper(trim(coalesce(creado_por, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
    and upper(trim(coalesce(creado_por_rol, ''))) = 'RESIDENTE'
    and upper(trim(coalesce(residente, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
    and exists (
      select 1
      from public.proyectos p
      where upper(trim(coalesce(p.nombre, ''))) = upper(trim(coalesce(egresos.proyecto, '')))
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

-- UPDATE:
-- ADMIN puede editar todo
-- RESIDENTE solo puede editar egresos que creó él mismo,
-- que sigan siendo suyos y dentro de un proyecto asignado
create policy "egresos_update_admin_or_owner"
on public.egresos
for update
to authenticated
using (
  public.current_role() = 'ADMIN'
  or (
    public.current_role() = 'RESIDENTE'
    and upper(trim(coalesce(creado_por, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
    and upper(trim(coalesce(creado_por_rol, ''))) = 'RESIDENTE'
  )
)
with check (
  public.current_role() = 'ADMIN'
  or (
    public.current_role() = 'RESIDENTE'
    and upper(trim(coalesce(creado_por, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
    and upper(trim(coalesce(creado_por_rol, ''))) = 'RESIDENTE'
    and upper(trim(coalesce(residente, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
    and exists (
      select 1
      from public.proyectos p
      where upper(trim(coalesce(p.nombre, ''))) = upper(trim(coalesce(egresos.proyecto, '')))
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

-- DELETE:
-- En tu app realmente anulas, no borras físicamente.
-- Aun así, si algo intenta delete:
--   - ADMIN sí puede
--   - RESIDENTE solo si es dueño del registro
create policy "egresos_delete_admin_or_owner"
on public.egresos
for delete
to authenticated
using (
  public.current_role() = 'ADMIN'
  or (
    public.current_role() = 'RESIDENTE'
    and upper(trim(coalesce(creado_por, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
    and upper(trim(coalesce(creado_por_rol, ''))) = 'RESIDENTE'
  )
);