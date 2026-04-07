import { supabase } from "../../lib/supabase";
import {
  norm,
  safeNum,
  ensureISODate,
  getCajaChicaEstado,
} from "../../utils/appHelpers";
import {
  normalizeCajaChicaResidente,
  normalizeCajaChicaDesembolso,
  normalizeMovimientoCajaChica,
} from "../../utils/normalizers";

export const cargarCajaChicaResidenteDB = async () => {
  const { data, error } = await supabase
    .from("caja_chica_residente")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(normalizeCajaChicaResidente);
};

export const getCajaChicaResidenteByNombreLocal = (lista, residente) => {
  const r = norm(residente);
  return (lista || []).find((c) => norm(c.residente) === r) || null;
};

export const getResumenCajaChicaResidenteLocal = (lista, residente) => {
  const caja = getCajaChicaResidenteByNombreLocal(lista, residente);

  if (!caja) {
    return {
      existe: false,
      residente: norm(residente),
      montoActualAsignado: 0,
      gastadoActual: 0,
      saldoActual: 0,
      estado: "SIN FONDO",
      fechaUltimoDesembolso: "",
    };
  }

  const estadoCalc = getCajaChicaEstado(
    caja.montoActualAsignado ?? caja.monto_actual_asignado,
    caja.gastadoActual ?? caja.gastado_actual
  );

  return {
    existe: true,
    ...caja,
    residente: norm(caja.residente),
    montoActualAsignado: safeNum(
      caja.montoActualAsignado ?? caja.monto_actual_asignado
    ),
    gastadoActual: safeNum(caja.gastadoActual ?? caja.gastado_actual),
    saldoActual: safeNum(caja.saldoActual ?? caja.saldo_actual),
    estado: norm(caja.estado || estadoCalc.estado),
    fechaUltimoDesembolso:
      caja.fechaUltimoDesembolso ?? caja.fecha_ultimo_desembolso ?? "",
  };
};

export const getResumenesCajaChicaResidenteLocal = (lista) => lista || [];

export const registrarDesembolsoCajaChicaResidenteDB = async ({
  payload,
  actor,
}) => {
  const residenteN = norm(payload?.residente);
  const fechaDesembolso = ensureISODate(
    payload?.fechaDesembolso || payload?.fecha_desembolso
  );
  const monto = safeNum(
    payload?.monto ?? payload?.montoDesembolsado ?? payload?.monto_desembolsado
  );

  const { data: cajaActual, error: cajaActualError } = await supabase
    .from("caja_chica_residente")
    .select("*")
    .eq("residente", residenteN)
    .maybeSingle();

  if (cajaActualError) throw cajaActualError;

  const saldoAnterior = safeNum(cajaActual?.saldo_actual);
  const estadoAnterior = norm(cajaActual?.estado);

  const deudaArrastrada = saldoAnterior < 0 ? Math.abs(saldoAnterior) : 0;
  const gastadoNuevo = deudaArrastrada;

  const estadoNuevoCalc = getCajaChicaEstado(monto, gastadoNuevo);

  const cajaPayload = {
    residente: residenteN,
    monto_actual_asignado: monto,
    gastado_actual: gastadoNuevo,
    saldo_actual: estadoNuevoCalc.saldo,
    estado: estadoNuevoCalc.estado,
    fecha_ultimo_desembolso: fechaDesembolso,
    observacion: norm(payload?.observacion),
    creado_por: norm(actor?.name),
    creado_por_rol: norm(actor?.role),
    updated_at: new Date().toISOString(),
  };

  const { data: cajaData, error: cajaError } = await supabase
    .from("caja_chica_residente")
    .upsert([cajaPayload], { onConflict: "residente" })
    .select()
    .single();

  if (cajaError) throw cajaError;

  const desembolsoFinal = {
  caja_chica_residente_id: cajaData.id,
  proyecto: "GENERAL",
  residente: residenteN,
  fecha_desembolso: fechaDesembolso,
  monto_desembolsado: monto,
  saldo_final_antes_reposicion: saldoAnterior,
  estado_antes: estadoAnterior || "SIN FONDO",
  estado_nuevo: estadoNuevoCalc.estado,
  observacion: norm(payload?.observacion),
  creado_por: norm(actor?.name),
  creado_por_rol: norm(actor?.role),
};

  const { data: desembolsoData, error: desembolsoError } = await supabase
    .from("caja_chica_desembolsos")
    .insert([desembolsoFinal])
    .select()
    .single();

  if (desembolsoError) throw desembolsoError;

  return {
    caja: normalizeCajaChicaResidente(cajaData),
    desembolso: normalizeCajaChicaDesembolso(desembolsoData),
  };
};

export const ajustarCajaChicaResidentePorDeltaDB = async ({
  residente,
  delta,
}) => {
  const residenteN = norm(residente);
  if (!residenteN) return null;

  const { data: caja, error: cajaError } = await supabase
    .from("caja_chica_residente")
    .select("*")
    .eq("residente", residenteN)
    .maybeSingle();

  if (cajaError) throw cajaError;
  if (!caja?.id) {
    throw new Error("Este residente no tiene caja chica activa.");
  }

  const nuevoGastado = safeNum(caja.gastado_actual) + safeNum(delta);

  const estadoCalc = getCajaChicaEstado(
    safeNum(caja.monto_actual_asignado),
    nuevoGastado
  );

  const { data: cajaData, error: updateError } = await supabase
    .from("caja_chica_residente")
    .update({
      gastado_actual: nuevoGastado,
      saldo_actual: estadoCalc.saldo,
      estado: estadoCalc.estado,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caja.id)
    .select()
    .single();

  if (updateError) throw updateError;

  return normalizeCajaChicaResidente(cajaData);
};

export const registrarMovimientoCajaChicaResidenteDB = async ({
  payload,
  actor,
}) => {
  const residenteN = norm(payload?.residente || actor?.name);
  const proyectoN = norm(payload?.proyecto);

  const { data: caja, error: cajaLookupError } = await supabase
    .from("caja_chica_residente")
    .select("*")
    .eq("residente", residenteN)
    .maybeSingle();

  if (cajaLookupError) throw cajaLookupError;

  if (!caja?.id) {
    throw new Error("Este residente no tiene caja chica activa.");
  }

  const movimientoFinal = {
    caja_chica_residente_id: caja.id,
    egreso_id: payload?.egresoId ?? payload?.egreso_id ?? null,
    residente: residenteN,
    proyecto: proyectoN,
    fecha: ensureISODate(payload?.fecha),
    concepto: norm(payload?.concepto),
    categoria: norm(payload?.categoria),
    valor: safeNum(payload?.valor),
    creado_por: norm(actor?.name),
    creado_por_rol: norm(actor?.role),
  };

  const { data: movData, error: movError } = await supabase
    .from("movimientos_caja_chica")
    .insert([movimientoFinal])
    .select()
    .single();

  if (movError) throw movError;

 const cajaActualizada = await ajustarCajaChicaResidentePorDeltaDB({
  residente: residenteN,
  delta: safeNum(payload?.valor),
});

  return {
  movimiento: normalizeMovimientoCajaChica(movData),
  caja: cajaActualizada,
};
};

export const revertirMovimientoCajaChicaResidentePorEgresoDB = async ({
  egresoId,
  residente,
}) => {
  const { data: movimientoActual, error: movimientoActualError } = await supabase
    .from("movimientos_caja_chica")
    .select("*")
    .eq("egreso_id", egresoId)
    .maybeSingle();

  if (movimientoActualError) throw movimientoActualError;

  if (!movimientoActual?.id) return null;

  const valorMovimiento = safeNum(movimientoActual.valor);

  const { error: deleteMovimientoError } = await supabase
    .from("movimientos_caja_chica")
    .delete()
    .eq("id", movimientoActual.id);

  if (deleteMovimientoError) throw deleteMovimientoError;

  return await ajustarCajaChicaResidentePorDeltaDB({
    residente,
    delta: -valorMovimiento,
  });
};