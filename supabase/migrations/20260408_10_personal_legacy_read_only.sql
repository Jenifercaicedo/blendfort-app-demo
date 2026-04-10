-- =========================================================
-- 20260408_10_personal_legacy_read_only.sql
-- Objetivo:
--   Dejar la tabla legacy `personal` en modo solo lectura
--   para administración, evitando que vuelva a ser usada
--   como fuente activa por la app.
--
-- Fuente activa nueva:
--   - empleados
--   - empleado_proyecto
--   - v_empleado_asignaciones
-- =========================================================

-- =========================================================
-- 1) Asegurar RLS
-- =========================================================
alter table public.personal enable row level security;

-- =========================================================
-- 2) Eliminar policies anteriores de personal
-- =========================================================
drop policy if exists "personal_select_authenticated" on public.personal;
drop policy if exists "personal_insert_authenticated" on public.personal;
drop policy if exists "personal_update_authenticated" on public.personal;
drop policy if exists "personal_delete_authenticated" on public.personal;

drop policy if exists "personal_select_admin_or_assigned_resident" on public.personal;
drop policy if exists "personal_insert_admin_only" on public.personal;
drop policy if exists "personal_update_admin_only" on public.personal;
drop policy if exists "personal_delete_admin_only" on public.personal;

drop policy if exists "personal_select_admin_only_legacy" on public.personal;
drop policy if exists "personal_insert_block_legacy" on public.personal;
drop policy if exists "personal_update_block_legacy" on public.personal;
drop policy if exists "personal_delete_block_legacy" on public.personal;

-- =========================================================
-- 3) Nueva política: solo ADMIN puede leer
-- =========================================================
create policy "personal_select_admin_only_legacy"
on public.personal
for select
to authenticated
using (
  public.current_role() = 'ADMIN'
);

-- =========================================================
-- 4) Bloquear escrituras para clientes autenticados
-- =========================================================
create policy "personal_insert_block_legacy"
on public.personal
for insert
to authenticated
with check (
  false
);

create policy "personal_update_block_legacy"
on public.personal
for update
to authenticated
using (
  false
)
with check (
  false
);

create policy "personal_delete_block_legacy"
on public.personal
for delete
to authenticated
using (
  false
);

-- =========================================================
-- 5) Comentario documental en la tabla
-- =========================================================
comment on table public.personal is
'LEGACY: tabla reemplazada funcionalmente por public.empleados + public.empleado_proyecto + public.v_empleado_asignaciones. Mantener solo como respaldo temporal y solo lectura admin.';