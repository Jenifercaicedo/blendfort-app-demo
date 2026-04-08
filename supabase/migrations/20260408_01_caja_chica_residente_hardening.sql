-- =========================================================
-- 20260408_01_caja_chica_residente_hardening.sql
-- Objetivo:
--   Blindar la lógica de caja chica por residente en DB
--   para que saldo_actual y estado se recalculen solos
--   desde movimientos_caja_chica y desembolsos.
-- =========================================================

-- 1) Calcular estado de caja chica
create or replace function public.calc_caja_chica_estado(
  p_monto numeric,
  p_gastado numeric
)
returns text
language plpgsql
as $$
declare
  v_monto numeric := coalesce(p_monto, 0);
  v_gastado numeric := coalesce(p_gastado, 0);
  v_saldo numeric := v_monto - v_gastado;
  v_ratio numeric := 0;
begin
  if v_monto <= 0 then
    return 'SIN FONDO';
  end if;

  if v_saldo < 0 then
    return 'EXCEDIDA';
  end if;

  if v_saldo = 0 then
    return 'AGOTADA';
  end if;

  v_ratio := case when v_monto > 0 then v_saldo / v_monto else 0 end;

  if v_ratio <= 0.20 then
    return 'POR AGOTARSE';
  end if;

  return 'DISPONIBLE';
end;
$$;

-- 2) Mantener consistencia en caja_chica_residente
create or replace function public.tg_sync_caja_chica_residente_fields()
returns trigger
language plpgsql
as $$
begin
  new.monto_actual_asignado := coalesce(new.monto_actual_asignado, 0);
  new.gastado_actual := coalesce(new.gastado_actual, 0);
  new.saldo_actual := new.monto_actual_asignado - new.gastado_actual;
  new.estado := public.calc_caja_chica_estado(new.monto_actual_asignado, new.gastado_actual);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_sync_caja_chica_residente_fields
on public.caja_chica_residente;

create trigger trg_sync_caja_chica_residente_fields
before insert or update on public.caja_chica_residente
for each row
execute function public.tg_sync_caja_chica_residente_fields();

-- 3) Recalcular una caja chica residente desde sus movimientos reales
create or replace function public.recalc_caja_chica_residente_by_id(p_caja_id uuid)
returns void
language plpgsql
as $$
declare
  v_total_gastado numeric := 0;
begin
  if p_caja_id is null then
    return;
  end if;

  select coalesce(sum(valor), 0)
    into v_total_gastado
  from public.movimientos_caja_chica
  where caja_chica_residente_id = p_caja_id;

  update public.caja_chica_residente
  set
    gastado_actual = v_total_gastado,
    saldo_actual = coalesce(monto_actual_asignado, 0) - v_total_gastado,
    estado = public.calc_caja_chica_estado(monto_actual_asignado, v_total_gastado),
    updated_at = now()
  where id = p_caja_id;
end;
$$;

-- 4) Recalcular caja del residente cuando cambian movimientos
create or replace function public.tg_recalc_caja_chica_residente_from_mov()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.recalc_caja_chica_residente_by_id(new.caja_chica_residente_id);
    return new;
  elsif tg_op = 'UPDATE' then
    if old.caja_chica_residente_id is distinct from new.caja_chica_residente_id then
      perform public.recalc_caja_chica_residente_by_id(old.caja_chica_residente_id);
      perform public.recalc_caja_chica_residente_by_id(new.caja_chica_residente_id);
    else
      perform public.recalc_caja_chica_residente_by_id(new.caja_chica_residente_id);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    perform public.recalc_caja_chica_residente_by_id(old.caja_chica_residente_id);
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_recalc_caja_chica_residente_from_mov
on public.movimientos_caja_chica;

create trigger trg_recalc_caja_chica_residente_from_mov
after insert or update or delete on public.movimientos_caja_chica
for each row
execute function public.tg_recalc_caja_chica_residente_from_mov();

-- 5) Función para registrar un desembolso del admin
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
as $$
declare
  v_caja_id uuid;
  v_monto numeric := coalesce(p_monto, 0);
  v_estado_antes text;
  v_saldo_antes numeric := 0;
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
      gastado_actual,
      saldo_actual,
      estado,
      fecha_ultimo_desembolso,
      observacion,
      creado_por,
      creado_por_rol
    )
    values (
      p_residente,
      v_monto,
      0,
      v_monto,
      public.calc_caja_chica_estado(v_monto, 0),
      p_fecha_desembolso,
      p_observacion,
      p_creado_por,
      p_creado_por_rol
    )
    returning id, estado, saldo_actual
      into v_caja_id, v_estado_antes, v_saldo_antes;

    v_estado_antes := 'SIN FONDO';
    v_saldo_antes := 0;
  else
    update public.caja_chica_residente
    set
      monto_actual_asignado = coalesce(monto_actual_asignado, 0) + v_monto,
      fecha_ultimo_desembolso = p_fecha_desembolso,
      observacion = p_observacion,
      created_at = created_at
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

-- 6) Backfill: recalcular todas las cajas chicas residentes actuales
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