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

/* ===========================
   DESEMBOLSO RESIDENTE
   Usa la RPC nueva de DB.
   La DB:
   - crea/actualiza caja chica residente
   - registra el historial en caja_chica_desembolsos
   - recalcula saldo/estado
=========================== */
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

  if (!residenteN) {
    throw new Error("El residente es obligatorio.");
  }

  if (monto <= 0) {
    throw new Error("El monto del desembolso debe ser mayor a 0.");
  }

  const { error: rpcError } = await supabase.rpc("registrar_desembolso_residente", {
    p_residente: residenteN,
    p_fecha_desembolso: fechaDesembolso,
    p_monto: monto,
    p_observacion: norm(payload?.observacion) || null,
    p_creado_por: norm(actor?.name),
    p_creado_por_rol: norm(actor?.role),
  });

  if (rpcError) throw rpcError;

  // Leemos el estado final real desde la base
  const { data: cajaData, error: cajaError } = await supabase
    .from("caja_chica_residente")
    .select("*")
    .eq("residente", residenteN)
    .single();

  if (cajaError) throw cajaError;

  const { data: desembolsoData, error: desembolsoError } = await supabase
    .from("caja_chica_desembolsos")
    .select("*")
    .eq("caja_chica_residente_id", cajaData.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (desembolsoError) throw desembolsoError;

  return {
    caja: normalizeCajaChicaResidente(cajaData),
    desembolso: normalizeCajaChicaDesembolso(desembolsoData),
  };
};

/* ===========================
   AJUSTE MANUAL LEGACY
   Lo dejamos por compatibilidad, pero ya no es la ruta principal.
=========================== */
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

/* ===========================
   MOVIMIENTO CAJA CHICA RESIDENTE
   Inserta el movimiento.
   La DB recalcula saldo/estado sola por trigger.
=========================== */
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

  // Leemos la caja ya recalculada por DB
  const { data: cajaActualizada, error: cajaRefreshError } = await supabase
    .from("caja_chica_residente")
    .select("*")
    .eq("id", caja.id)
    .single();

  if (cajaRefreshError) throw cajaRefreshError;

  return {
    movimiento: normalizeMovimientoCajaChica(movData),
    caja: normalizeCajaChicaResidente(cajaActualizada),
  };
};

/* ===========================
   REVERSA POR EGRESO
   Borra el movimiento y deja que la DB recalcule sola.
   Acepta:
   - revertirMovimientoCajaChicaResidentePorEgresoDB(id)
   - revertirMovimientoCajaChicaResidentePorEgresoDB({ egresoId })
=========================== */
export const revertirMovimientoCajaChicaResidentePorEgresoDB = async (input) => {
  const egresoId =
    typeof input === "object" && input !== null ? input.egresoId : input;

  if (!egresoId) return null;

  const { data: movimientoActual, error: movimientoActualError } = await supabase
    .from("movimientos_caja_chica")
    .select("*")
    .eq("egreso_id", egresoId)
    .maybeSingle();

  if (movimientoActualError) throw movimientoActualError;

  if (!movimientoActual?.id) return null;

  const cajaId = movimientoActual.caja_chica_residente_id;

  const { error: deleteMovimientoError } = await supabase
    .from("movimientos_caja_chica")
    .delete()
    .eq("id", movimientoActual.id);

  if (deleteMovimientoError) throw deleteMovimientoError;

  if (!cajaId) {
    return {
      movimientoEliminado: true,
      caja: null,
    };
  }

  const { data: cajaActualizada, error: cajaRefreshError } = await supabase
    .from("caja_chica_residente")
    .select("*")
    .eq("id", cajaId)
    .single();

  if (cajaRefreshError) throw cajaRefreshError;

  return {
    movimientoEliminado: true,
    caja: normalizeCajaChicaResidente(cajaActualizada),
  };
};