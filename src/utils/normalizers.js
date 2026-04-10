import { norm, safeNum } from "./appHelpers";

export const normalizeEgreso = (e) => ({
  ...e,
  metodoPago: e.metodo_pago ?? e.metodoPago ?? "",
  pagadoPor: e.pagado_por ?? e.pagadoPor ?? "",
  tieneFactura:
    typeof e.tiene_factura === "boolean"
      ? e.tiene_factura
      : e.factura === "si",
  tipoRegistro: e.tipo_registro ?? e.tipoRegistro ?? "EGRESO",
  numHorasExtras: e.num_horas_extras ?? e.numHorasExtras ?? 0,
  valoresPendientes: e.valores_pendientes ?? e.valoresPendientes ?? 0,
  creadoPor: e.creado_por ?? e.creadoPor ?? "",
  creadoPorRol: e.creado_por_rol ?? e.creadoPorRol ?? "",
  creadoPorNombre: e.creado_por_nombre ?? e.creadoPorNombre ?? "",
  actualizadoPor: e.actualizado_por ?? e.actualizadoPor ?? "",
  actualizadoPorRol: e.actualizado_por_rol ?? e.actualizadoPorRol ?? "",
  fuenteFondos: e.fuente_fondos ?? e.fuenteFondos ?? "GENERAL",
});

export const normalizePersonal = (p) => ({
  ...p,
  valorDia: p.valor_dia ?? p.valorDia ?? 0,
  valorHoraExtra: p.valor_hora_extra ?? p.valorHoraExtra ?? 0,
  salarioMensual: p.salario_mensual ?? p.salarioMensual ?? 0,
  fechaContratacion: p.fecha_contratacion ?? p.fechaContratacion ?? "",
});

export const normalizeCajaChicaProyecto = (c) => ({
  ...c,
  proyecto: norm(c.proyecto),
  residente: norm(c.residente),
  montoActualAsignado: safeNum(c.monto_actual_asignado ?? c.montoActualAsignado),
  gastadoActual: safeNum(c.gastado_actual ?? c.gastadoActual),
  saldoActual: safeNum(c.saldo_actual ?? c.saldoActual),
  fechaUltimoDesembolso: c.fecha_ultimo_desembolso || c.fechaUltimoDesembolso || "",
  creadoPor: c.creado_por ?? c.creadoPor ?? "",
  creadoPorRol: c.creado_por_rol ?? c.creadoPorRol ?? "",
});

export const normalizeCajaChicaDesembolso = (d) => ({
  ...d,
  proyecto: norm(d.proyecto),
  residente: norm(d.residente),
  fechaDesembolso: d.fecha_desembolso || d.fechaDesembolso || "",
  montoDesembolsado: safeNum(d.monto_desembolsado ?? d.montoDesembolsado),
  saldoFinalAntesReposicion: safeNum(
    d.saldo_final_antes_reposicion ?? d.saldoFinalAntesReposicion
  ),
  estadoAntes: norm(d.estado_antes ?? d.estadoAntes),
  estadoNuevo: norm(d.estado_nuevo ?? d.estadoNuevo),
  creadoPor: d.creado_por ?? d.creadoPor ?? "",
  creadoPorRol: d.creado_por_rol ?? d.creadoPorRol ?? "",
});

export const normalizeMovimientoCajaChica = (m) => ({
  ...m,
  proyecto: norm(m.proyecto),
  fecha: m.fecha || "",
  concepto: norm(m.concepto),
  categoria: norm(m.categoria),
  valor: safeNum(m.valor),
  creadoPor: m.creado_por ?? m.creadoPor ?? "",
  creadoPorRol: m.creado_por_rol ?? m.creadoPorRol ?? "",
});
export const normalizeCajaChicaResidente = (c) => ({
  ...c,
  residente: norm(c.residente),
  montoActualAsignado: safeNum(c.monto_actual_asignado ?? c.montoActualAsignado),
  gastadoActual: safeNum(c.gastado_actual ?? c.gastadoActual),
  saldoActual: safeNum(c.saldo_actual ?? c.saldoActual),
  fechaUltimoDesembolso:
    c.fecha_ultimo_desembolso || c.fechaUltimoDesembolso || "",
  creadoPor: c.creado_por ?? c.creadoPor ?? "",
  creadoPorRol: c.creado_por_rol ?? c.creadoPorRol ?? "",
});