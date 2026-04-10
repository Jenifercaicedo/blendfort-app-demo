-- =========================================================
-- 20260408_03_rls_caja_chica_residente.sql
-- Objetivo:
--   Endurecer RLS de caja chica por residente.
--   - ADMIN: acceso total
--   - RESIDENTE: solo ve su caja, sus movimientos y sus desembolsos
--   - RESIDENTE: puede insertar/borrar solo sus propios movimientos
--   - Desembolsos administrativos: solo ADMIN
-- =========================================================

-- =========================================================
-- Endurecer funciones críticas de caja chica
-- para que el recálculo y la RPC no dependan
-- de permisos frágiles del cliente autenticado.
-- =========================================================

alter function public.calc_caja_chica_estado(numeric, numeric)
  security definer;
alter function public.calc_caja_chica_estado(numeric, numeric)
  set search_path = public;

alter function public.tg_sync_caja_chica_residente_fields()
  security definer;
alter function public.tg_sync_caja_chica_residente_fields()
  set search_path = public;

alter function public.recalc_caja_chica_residente_by_id(uuid)
  security definer;
alter function public.recalc_caja_chica_residente_by_id(uuid)
  set search_path = public;

alter function public.tg_recalc_caja_chica_residente_from_mov()
  security definer;
alter function public.tg_recalc_caja_chica_residente_from_mov()
  set search_path = public;

alter function public.registrar_desembolso_residente(text, date, numeric, text, text, text)
  security definer;
alter function public.registrar_desembolso_residente(text, date, numeric, text, text, text)
  set search_path = public;

-- =========================================================
-- CAJA_CHICA_RESIDENTE
-- =========================================================

-- Eliminar policies abiertas anteriores
drop policy if exists "allow_select_caja_chica_residente" on public.caja_chica_residente;
drop policy if exists "allow_insert_caja_chica_residente" on public.caja_chica_residente;
drop policy if exists "allow_update_caja_chica_residente" on public.caja_chica_residente;
drop policy if exists "allow_delete_caja_chica_residente" on public.caja_chica_residente;

drop policy if exists "caja_chica_residente_select_authenticated" on public.caja_chica_residente;
drop policy if exists "caja_chica_residente_insert_authenticated" on public.caja_chica_residente;
drop policy if exists "caja_chica_residente_update_authenticated" on public.caja_chica_residente;
drop policy if exists "caja_chica_residente_delete_authenticated" on public.caja_chica_residente;

-- SELECT:
-- ADMIN ve todo
-- RESIDENTE solo ve su propia caja
create policy "caja_chica_residente_select_admin_or_self"
on public.caja_chica_residente
for select
to authenticated
using (
  public.current_role() = 'ADMIN'
  or (
    public.current_role() = 'RESIDENTE'
    and upper(trim(coalesce(residente, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
  )
);

-- INSERT:
-- solo ADMIN
create policy "caja_chica_residente_insert_admin_only"
on public.caja_chica_residente
for insert
to authenticated
with check (
  public.current_role() = 'ADMIN'
);

-- UPDATE:
-- solo ADMIN directo.
-- El recálculo interno lo hacen las funciones SECURITY DEFINER.
create policy "caja_chica_residente_update_admin_only"
on public.caja_chica_residente
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
create policy "caja_chica_residente_delete_admin_only"
on public.caja_chica_residente
for delete
to authenticated
using (
  public.current_role() = 'ADMIN'
);

-- =========================================================
-- MOVIMIENTOS_CAJA_CHICA
-- =========================================================

-- Eliminar policies abiertas anteriores
drop policy if exists "allow_select_movimientos_caja_chica" on public.movimientos_caja_chica;
drop policy if exists "allow_insert_movimientos_caja_chica" on public.movimientos_caja_chica;
drop policy if exists "allow_update_movimientos_caja_chica" on public.movimientos_caja_chica;
drop policy if exists "allow_delete_movimientos_caja_chica" on public.movimientos_caja_chica;

drop policy if exists "movimientos_caja_chica_select_authenticated" on public.movimientos_caja_chica;
drop policy if exists "movimientos_caja_chica_insert_authenticated" on public.movimientos_caja_chica;
drop policy if exists "movimientos_caja_chica_update_authenticated" on public.movimientos_caja_chica;
drop policy if exists "movimientos_caja_chica_delete_authenticated" on public.movimientos_caja_chica;

-- SELECT:
-- ADMIN ve todo
-- RESIDENTE solo ve movimientos donde residente = su nombre
create policy "movimientos_caja_chica_select_admin_or_self"
on public.movimientos_caja_chica
for select
to authenticated
using (
  public.current_role() = 'ADMIN'
  or (
    public.current_role() = 'RESIDENTE'
    and upper(trim(coalesce(residente, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
  )
);

-- INSERT:
-- ADMIN puede insertar cualquiera
-- RESIDENTE solo puede insertar movimientos propios
-- y solo si la caja_chica_residente_id pertenece a su propia caja
create policy "movimientos_caja_chica_insert_admin_or_self"
on public.movimientos_caja_chica
for insert
to authenticated
with check (
  public.current_role() = 'ADMIN'
  or (
    public.current_role() = 'RESIDENTE'
    and upper(trim(coalesce(residente, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
    and exists (
      select 1
      from public.caja_chica_residente c
      where c.id = movimientos_caja_chica.caja_chica_residente_id
        and upper(trim(coalesce(c.residente, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
    )
  )
);

-- UPDATE:
-- solo ADMIN
-- En tu flujo actual la edición de movimientos se resuelve borrando + recreando
create policy "movimientos_caja_chica_update_admin_only"
on public.movimientos_caja_chica
for update
to authenticated
using (
  public.current_role() = 'ADMIN'
)
with check (
  public.current_role() = 'ADMIN'
);

-- DELETE:
-- ADMIN puede borrar cualquiera
-- RESIDENTE solo puede borrar movimientos propios
create policy "movimientos_caja_chica_delete_admin_or_self"
on public.movimientos_caja_chica
for delete
to authenticated
using (
  public.current_role() = 'ADMIN'
  or (
    public.current_role() = 'RESIDENTE'
    and upper(trim(coalesce(residente, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
  )
);

-- =========================================================
-- CAJA_CHICA_DESEMBOLSOS
-- =========================================================

-- Eliminar policies abiertas anteriores
drop policy if exists "allow_select_caja_chica_desembolsos" on public.caja_chica_desembolsos;
drop policy if exists "allow_insert_caja_chica_desembolsos" on public.caja_chica_desembolsos;
drop policy if exists "allow_update_caja_chica_desembolsos" on public.caja_chica_desembolsos;
drop policy if exists "allow_delete_caja_chica_desembolsos" on public.caja_chica_desembolsos;

drop policy if exists "caja_chica_desembolsos_select_authenticated" on public.caja_chica_desembolsos;
drop policy if exists "caja_chica_desembolsos_insert_authenticated" on public.caja_chica_desembolsos;
drop policy if exists "caja_chica_desembolsos_update_authenticated" on public.caja_chica_desembolsos;
drop policy if exists "caja_chica_desembolsos_delete_authenticated" on public.caja_chica_desembolsos;

-- SELECT:
-- ADMIN ve todo
-- RESIDENTE solo ve su historial de desembolsos
create policy "caja_chica_desembolsos_select_admin_or_self"
on public.caja_chica_desembolsos
for select
to authenticated
using (
  public.current_role() = 'ADMIN'
  or (
    public.current_role() = 'RESIDENTE'
    and upper(trim(coalesce(residente, ''))) = upper(trim(coalesce(public.current_nombre(), '')))
  )
);

-- INSERT:
-- solo ADMIN
create policy "caja_chica_desembolsos_insert_admin_only"
on public.caja_chica_desembolsos
for insert
to authenticated
with check (
  public.current_role() = 'ADMIN'
);

-- UPDATE:
-- solo ADMIN
create policy "caja_chica_desembolsos_update_admin_only"
on public.caja_chica_desembolsos
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
create policy "caja_chica_desembolsos_delete_admin_only"
on public.caja_chica_desembolsos
for delete
to authenticated
using (
  public.current_role() = 'ADMIN'
);