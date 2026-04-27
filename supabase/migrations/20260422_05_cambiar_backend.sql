grant usage on schema public to authenticated;
grant select, insert, update on table public.catalogo_cargos to authenticated;

alter table public.catalogo_cargos enable row level security;

drop policy if exists "catalogo_cargos_select_authenticated" on public.catalogo_cargos;
create policy "catalogo_cargos_select_authenticated"
on public.catalogo_cargos
for select
to authenticated
using (true);

drop policy if exists "catalogo_cargos_insert_admin" on public.catalogo_cargos;
create policy "catalogo_cargos_insert_admin"
on public.catalogo_cargos
for insert
to authenticated
with check (
  auth.role() = 'authenticated'
  and lower(coalesce(auth.jwt()->>'email', '')) = 'admin@blendfortdemo.com'
);

drop policy if exists "catalogo_cargos_update_admin" on public.catalogo_cargos;
create policy "catalogo_cargos_update_admin"
on public.catalogo_cargos
for update
to authenticated
using (
  auth.role() = 'authenticated'
  and lower(coalesce(auth.jwt()->>'email', '')) = 'admin@blendfortdemo.com'
)
with check (
  auth.role() = 'authenticated'
  and lower(coalesce(auth.jwt()->>'email', '')) = 'admin@blendfortdemo.com'
);
