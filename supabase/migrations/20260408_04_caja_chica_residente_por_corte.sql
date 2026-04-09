-- =========================================================
-- 20260408_04_caja_chica_residente_por_corte.sql
-- Objetivo:
--   Cambiar caja chica residente de modo acumulativo
--   a modo por corte / reposición.
--
-- Reglas:
--   - Si el saldo anterior es positivo, el nuevo desembolso se suma.
--   - Si el saldo anterior es negativo, el nuevo desembolso se reduce.
--   - Cada desembolso crea historial en caja_chica_desembolsos.
--   - La caja actual del residente refleja solo el ciclo vigente.
--   - El gasto del ciclo vigente se calcula desde ultimo_corte_at.
-- =========================================================

-- 1) Nuevo campo para marcar el inicio del corte vigente
alter table public.caja_chica_residente
add column if not exists ultimo_corte_at timestamptz;

-- 2) Backfill inicial:
--    si existe historial de desembolsos, usamos el created_at del último;
--    si no, usamos created_at o now()
update public.caja_chica_residente c
set ultimo_corte_at = coalesce(
  (
    select max(d.created_at)
    from public.caja_chica_desembolsos d
    where d.caja_chica_residente_id = c.id
  ),
  c.created_at,
  now()
)
where c.ultimo_corte_at is null;

-- 3) Recalcular una caja chica residente SOLO con movimientos del corte vigente
create or replace function public.recalc_caja_chica_residente_by_id(p_caja_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_gastado numeric := 0;
  v_corte_at timestamptz;
begin
  if p_caja_id is null then
    return;
  end if;

  select ultimo_corte_at
    into v_corte_at
  from public.caja_chica_residente
  where id = p_caja_id;

  select coalesce(sum(valor), 0)
    into v_total_gastado
  from public.movimientos_caja_chica
  where caja_chica_residente_id = p_caja_id
    and (
      v_corte_at is null
      or created_at >= v_corte_at
    );

  update public.caja_chica_residente
  set
    gastado_actual = v_total_gastado,
    saldo_actual = coalesce(monto_actual_asignado, 0) - v_total_gastado,
    estado = public.calc_caja_chica_estado(monto_actual_asignado, v_total_gastado),
    updated_at = now()
  where id = p_caja_id;
end;
$$;

-- 4) Nueva lógica de desembolso por corte/reposición
create or replace function public.registrar_desembolso_residente(
  p_residente text,
  p_fecha_desembolso date,
  p_monto numeric,
  p_observacion text,
  p_creado_por text,
  p_creado_por_rol text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caja_id uuid;
  v_monto numeric := coalesce(p_monto, 0);
  v_estado_antes text;
  v_saldo_antes numeric := 0;
  v_fondo_nuevo numeric := 0;
  v_corte_ts timestamptz := now();
begin
  if trim(coalesce(p_residente, '')) = '' then
    raise exception 'El residente es obligatorio';
  end if;

  if v_monto <= 0 then
    raise exception 'El monto del desembolso debe ser mayor a 0';
  end if;

  select id, estado, saldo_actual
    into v_caja_id, v_estado_antes, v_saldo_antes
  from public.caja_chica_residente
  where residente = p_residente
  limit 1;

  -- Lógica solicitada:
  -- saldo positivo: se suma
  -- saldo negativo: se resta
  v_fondo_nuevo :=
    case
      when coalesce(v_saldo_antes, 0) > 0 then coalesce(v_saldo_antes, 0) + v_monto
      when coalesce(v_saldo_antes, 0) < 0 then v_monto + coalesce(v_saldo_antes, 0)
      else v_monto
    end;

  if v_caja_id is null then
    insert into public.caja_chica_residente (
      residente,
      monto_actual_asignado,
      gastado_actual,
      saldo_actual,
      estado,
      fecha_ultimo_desembolso,
      ultimo_corte_at,
      observacion,
      creado_por,
      creado_por_rol
    )
    values (
      p_residente,
      v_fondo_nuevo,
      0,
      v_fondo_nuevo,
      public.calc_caja_chica_estado(v_fondo_nuevo, 0),
      p_fecha_desembolso,
      v_corte_ts,
      p_observacion,
      p_creado_por,
      p_creado_por_rol
    )
    returning id into v_caja_id;

    v_estado_antes := 'SIN FONDO';
    v_saldo_antes := 0;
  else
    update public.caja_chica_residente
    set
      monto_actual_asignado = v_fondo_nuevo,
      gastado_actual = 0,
      saldo_actual = v_fondo_nuevo,
      estado = public.calc_caja_chica_estado(v_fondo_nuevo, 0),
      fecha_ultimo_desembolso = p_fecha_desembolso,
      ultimo_corte_at = v_corte_ts,
      observacion = p_observacion,
      updated_at = now()
    where id = v_caja_id;
  end if;

  insert into public.caja_chica_desembolsos (
    proyecto,
    residente,
    fecha_desembolso,
    monto_desembolsado,
    saldo_final_antes_reposicion,
    estado_antes,
    estado_nuevo,
    observacion,
    creado_por,
    creado_por_rol,
    caja_chica_residente_id
  )
  select
    null,
    c.residente,
    p_fecha_desembolso,
    v_monto,
    v_saldo_antes,
    coalesce(v_estado_antes, 'SIN FONDO'),
    c.estado,
    p_observacion,
    p_creado_por,
    p_creado_por_rol,
    c.id
  from public.caja_chica_residente c
  where c.id = v_caja_id;
end;
$$;

-- 5) Recalcular todas las cajas con la nueva lógica
do $$
declare
  r record;
begin
  for r in
    select id
    from public.caja_chica_residente
  loop
    perform public.recalc_caja_chica_residente_by_id(r.id);
  end loop;
end;
$$;