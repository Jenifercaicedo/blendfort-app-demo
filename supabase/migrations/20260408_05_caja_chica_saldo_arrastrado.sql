-- =========================================================
-- 20260408_05_caja_chica_saldo_arrastrado.sql
-- Objetivo:
--   Mantener fijo el monto del nuevo desembolso en
--   monto_actual_asignado y arrastrar el saldo anterior
--   por separado.
--
-- Nueva fórmula:
--   saldo_actual = monto_actual_asignado + saldo_arrastrado - gastado_actual
--
-- Reglas:
--   - monto_actual_asignado = nuevo desembolso
--   - saldo_arrastrado = saldo anterior (positivo o negativo)
--   - gastado_actual = gasto del corte actual
--   - saldo_actual = resultado real visible del corte
-- =========================================================

-- 1) Nueva columna
alter table public.caja_chica_residente
add column if not exists saldo_arrastrado numeric(12,2) not null default 0;

-- 2) Backfill inicial
update public.caja_chica_residente
set saldo_arrastrado = coalesce(saldo_arrastrado, 0);

-- 3) Trigger de consistencia: ahora usa saldo_arrastrado
create or replace function public.tg_sync_caja_chica_residente_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.monto_actual_asignado := coalesce(new.monto_actual_asignado, 0);
  new.saldo_arrastrado := coalesce(new.saldo_arrastrado, 0);
  new.gastado_actual := coalesce(new.gastado_actual, 0);

  new.saldo_actual :=
    new.monto_actual_asignado + new.saldo_arrastrado - new.gastado_actual;

  -- El estado sigue calculándose sobre el fondo efectivo del corte:
  -- fondo efectivo = monto_actual_asignado + saldo_arrastrado
  new.estado := public.calc_caja_chica_estado(
    new.monto_actual_asignado + new.saldo_arrastrado,
    new.gastado_actual
  );

  new.updated_at := now();
  return new;
end;
$$;

-- 4) Recalcular una caja chica residente usando solo movimientos del corte vigente
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
    saldo_actual = coalesce(monto_actual_asignado, 0)
                 + coalesce(saldo_arrastrado, 0)
                 - v_total_gastado,
    estado = public.calc_caja_chica_estado(
      coalesce(monto_actual_asignado, 0) + coalesce(saldo_arrastrado, 0),
      v_total_gastado
    ),
    updated_at = now()
  where id = p_caja_id;
end;
$$;

-- 5) RPC de desembolso:
--    - monto_actual_asignado queda fijo con el nuevo desembolso
--    - saldo_arrastrado guarda el saldo anterior
--    - gastado_actual se reinicia a 0
--    - saldo_actual se recalcula con la nueva fórmula
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

  if v_caja_id is null then
    insert into public.caja_chica_residente (
      residente,
      monto_actual_asignado,
      saldo_arrastrado,
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
      v_monto,
      0,
      0,
      v_monto,
      public.calc_caja_chica_estado(v_monto, 0),
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
      monto_actual_asignado = v_monto,
      saldo_arrastrado = v_saldo_antes,
      gastado_actual = 0,
      saldo_actual = v_monto + v_saldo_antes,
      estado = public.calc_caja_chica_estado(v_monto + v_saldo_antes, 0),
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

-- 6) Recalcular todo con la nueva fórmula
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