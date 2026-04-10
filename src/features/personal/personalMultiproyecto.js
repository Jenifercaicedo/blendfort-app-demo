import { supabase } from "../../lib/supabase";

const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const safeNum = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

const ensureISODate = (d) => (d ? String(d).slice(0, 10) : null);

const normalizeAsignacionView = (row) => ({
  id: row?.asignacion_id,
  empleadoId: row?.empleado_id,
  nombre: norm(row?.nombre),
  cargo: norm(row?.cargo),
  proyecto: norm(row?.proyecto),
  proyectoId: row?.proyecto_id || null,
  tipo: norm(row?.tipo || "CAMPO"),
  rol: norm(row?.rol || "OPERARIO"),
  estado: norm(row?.estado_asignacion || "ACTIVO"),
  valorDia: safeNum(row?.valor_dia),
  salarioMensual: safeNum(row?.salario_mensual),
  valorHoraExtra: safeNum(row?.valor_hora_extra),
  fechaContratacion: row?.fecha_contratacion || "",
  fechaInicio: row?.fecha_inicio || "",
  fechaFin: row?.fecha_fin || "",
  estadoGeneral: norm(row?.estado_general || "ACTIVO"),
  raw: row,
});

export const cargarPersonalMultiproyectoDB = async () => {
  const { data, error } = await supabase
    .from("v_empleado_asignaciones")
    .select("*")
    .order("nombre", { ascending: true })
    .order("asignacion_created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(normalizeAsignacionView);
};

export const agruparPersonalMultiproyecto = (lista = []) => {
  const map = new Map();

  for (const row of lista || []) {
    const nombreKey = norm(row?.nombre);
    if (!nombreKey) continue;

    const asignacion = {
      id: row?.id,
      empleadoId: row?.empleadoId,
      nombre: norm(row?.nombre),
      cargo: norm(row?.cargo),
      proyecto: norm(row?.proyecto),
      proyectoId: row?.proyectoId || null,
      tipo: norm(row?.tipo || "CAMPO"),
      rol: norm(row?.rol || "OPERARIO"),
      estado: norm(row?.estado || "ACTIVO"),
      valorDia: safeNum(row?.valorDia),
      salarioMensual: safeNum(row?.salarioMensual),
      valorHoraExtra: safeNum(row?.valorHoraExtra),
      fechaContratacion: row?.fechaContratacion || "",
      fechaInicio: row?.fechaInicio || "",
      fechaFin: row?.fechaFin || "",
      estadoGeneral: norm(row?.estadoGeneral || "ACTIVO"),
      raw: row?.raw || row,
    };

    if (!map.has(nombreKey)) {
      map.set(nombreKey, {
        key: nombreKey,
        empleadoId: row?.empleadoId,
        nombre: norm(row?.nombre),
        fechaContratacion: row?.fechaContratacion || "",
        estadoGeneral: norm(row?.estadoGeneral || "ACTIVO"),
        asignaciones: [],
      });
    }

    const grupo = map.get(nombreKey);
    grupo.asignaciones.push(asignacion);

    if (!grupo.fechaContratacion && row?.fechaContratacion) {
      grupo.fechaContratacion = row.fechaContratacion;
    }
  }

  return Array.from(map.values())
    .map((grupo) => {
      const asignaciones = [...grupo.asignaciones].sort((a, b) => {
        const aAct = a.estado === "ACTIVO" ? 0 : 1;
        const bAct = b.estado === "ACTIVO" ? 0 : 1;
        if (aAct !== bAct) return aAct - bAct;
        return String(a.proyecto || "").localeCompare(String(b.proyecto || ""));
      });

      const activas = asignaciones.filter((a) => a.estado === "ACTIVO");
      const inactivas = asignaciones.filter((a) => a.estado !== "ACTIVO");

      const proyectos = [...new Set(asignaciones.map((a) => a.proyecto).filter(Boolean))];
      const cargos = [...new Set(asignaciones.map((a) => a.cargo).filter(Boolean))];
      const roles = [...new Set(asignaciones.map((a) => a.rol).filter(Boolean))];
      const tipos = [...new Set(asignaciones.map((a) => a.tipo).filter(Boolean))];

      const referencia = activas[0] || asignaciones[0] || null;

      return {
        key: grupo.key,
        empleadoId: grupo.empleadoId,
        nombre: grupo.nombre,
        fechaContratacion: grupo.fechaContratacion || "",
        estadoGeneral: grupo.estadoGeneral || "ACTIVO",
        asignaciones,
        totalAsignaciones: asignaciones.length,
        asignacionesActivas: activas.length,
        asignacionesInactivas: inactivas.length,
        proyectos,
        cargos,
        roles,
        tipos,
        cargoPrincipal: referencia?.cargo || "",
        rolPrincipal: referencia?.rol || "",
        tipoPrincipal: referencia?.tipo || "",
        valorDiaPrincipal: safeNum(referencia?.valorDia),
        salarioMensualPrincipal: safeNum(referencia?.salarioMensual),
        valorHoraExtraPrincipal: safeNum(referencia?.valorHoraExtra),
      };
    })
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
};

const getProyectoIdByNombre = async (proyectoNombre) => {
  const proyectoN = norm(proyectoNombre);
  if (!proyectoN) throw new Error("El proyecto es obligatorio.");

  const { data, error } = await supabase
    .from("proyectos")
    .select("id,nombre")
    .eq("nombre", proyectoN)
    .single();

  if (error) throw error;
  return data?.id;
};

const getEmpleadoIdByNombre = async (nombre) => {
  const nombreN = norm(nombre);
  if (!nombreN) throw new Error("El nombre es obligatorio.");

  const { data, error } = await supabase
    .from("empleados")
    .select("id,nombre")
    .eq("nombre", nombreN)
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
};

export const addPersonalMultiproyectoDB = async (payload) => {
  const nombre = norm(payload?.nombre);
  const cargo = norm(payload?.cargo);
  const proyecto = norm(payload?.proyecto);
  const tipo = norm(payload?.tipo || "CAMPO");
  const rol = norm(payload?.rol || "OPERARIO");
  const estado = norm(payload?.estado || "ACTIVO");

  if (!nombre) throw new Error("El nombre es obligatorio.");
  if (!cargo) throw new Error("El cargo es obligatorio.");
  if (!proyecto) throw new Error("El proyecto es obligatorio.");

  let empleadoId = await getEmpleadoIdByNombre(nombre);

  if (!empleadoId) {
    const { data: empleadoData, error: empleadoError } = await supabase
      .from("empleados")
      .insert([
        {
          nombre,
          cargo,
          rol,
          tipo,
          valor_dia: safeNum(payload?.valorDia ?? payload?.valor_dia),
          salario_mensual: safeNum(payload?.salarioMensual ?? payload?.salario_mensual),
          valor_hora_extra: safeNum(payload?.valorHoraExtra ?? payload?.valor_hora_extra),
          fecha_contratacion: ensureISODate(
            payload?.fechaContratacion || payload?.fecha_contratacion
          ),
          estado_general: "ACTIVO",
        },
      ])
      .select()
      .single();

    if (empleadoError) throw empleadoError;
    empleadoId = empleadoData.id;
  } else {
    const { error: empleadoUpdateError } = await supabase
      .from("empleados")
      .update({
        cargo,
        rol,
        tipo,
        valor_dia: safeNum(payload?.valorDia ?? payload?.valor_dia),
        salario_mensual: safeNum(payload?.salarioMensual ?? payload?.salario_mensual),
        valor_hora_extra: safeNum(payload?.valorHoraExtra ?? payload?.valor_hora_extra),
        fecha_contratacion:
          ensureISODate(payload?.fechaContratacion || payload?.fecha_contratacion) || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", empleadoId);

    if (empleadoUpdateError) throw empleadoUpdateError;
  }

  const proyectoId = await getProyectoIdByNombre(proyecto);

  const { error: asignacionError } = await supabase
    .from("empleado_proyecto")
    .upsert(
      [
        {
          empleado_id: empleadoId,
          proyecto_id: proyectoId,
          cargo_en_proyecto: cargo,
          rol_en_proyecto: rol,
          tipo_en_proyecto: tipo,
          estado_asignacion: estado,
          fecha_inicio: ensureISODate(
            payload?.fechaContratacion || payload?.fecha_contratacion
          ),
        },
      ],
      { onConflict: "empleado_id,proyecto_id" }
    );

  if (asignacionError) throw asignacionError;

  return true;
};

export const updatePersonalMultiproyectoDB = async (asignacionId, payload) => {
  const nombre = norm(payload?.nombre);
  const cargo = norm(payload?.cargo);
  const proyecto = norm(payload?.proyecto);
  const tipo = norm(payload?.tipo || "CAMPO");
  const rol = norm(payload?.rol || "OPERARIO");
  const estado = norm(payload?.estado || "ACTIVO");

  const { data: asignacionActual, error: asignacionActualError } = await supabase
    .from("empleado_proyecto")
    .select("id,empleado_id,proyecto_id")
    .eq("id", asignacionId)
    .single();

  if (asignacionActualError) throw asignacionActualError;

  const proyectoIdNuevo = await getProyectoIdByNombre(proyecto);

  const { error: empleadoError } = await supabase
    .from("empleados")
    .update({
      nombre,
      cargo,
      rol,
      tipo,
      valor_dia: safeNum(payload?.valorDia ?? payload?.valor_dia),
      salario_mensual: safeNum(payload?.salarioMensual ?? payload?.salario_mensual),
      valor_hora_extra: safeNum(payload?.valorHoraExtra ?? payload?.valor_hora_extra),
      fecha_contratacion:
        ensureISODate(payload?.fechaContratacion || payload?.fecha_contratacion) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", asignacionActual.empleado_id);

  if (empleadoError) throw empleadoError;

  const { error: asignacionError } = await supabase
    .from("empleado_proyecto")
    .update({
      proyecto_id: proyectoIdNuevo,
      cargo_en_proyecto: cargo,
      rol_en_proyecto: rol,
      tipo_en_proyecto: tipo,
      estado_asignacion: estado,
      updated_at: new Date().toISOString(),
    })
    .eq("id", asignacionId);

  if (asignacionError) throw asignacionError;

  return true;
};

export const toggleEstadoAsignacionMultiproyectoDB = async (asignacionId, nextEstado) => {
  const estado = norm(nextEstado || "ACTIVO");

  const { error } = await supabase
    .from("empleado_proyecto")
    .update({
      estado_asignacion: estado,
      updated_at: new Date().toISOString(),
    })
    .eq("id", asignacionId);

  if (error) throw error;
  return true;
};

export const deleteAsignacionMultiproyectoDB = async (asignacionId) => {
  const { data: asignacion, error: asignacionError } = await supabase
    .from("empleado_proyecto")
    .select("id,empleado_id")
    .eq("id", asignacionId)
    .single();

  if (asignacionError) throw asignacionError;

  const empleadoId = asignacion.empleado_id;

  const { error: deleteError } = await supabase
    .from("empleado_proyecto")
    .delete()
    .eq("id", asignacionId);

  if (deleteError) throw deleteError;

  const { count, error: countError } = await supabase
    .from("empleado_proyecto")
    .select("*", { count: "exact", head: true })
    .eq("empleado_id", empleadoId);

  if (countError) throw countError;

  if ((count || 0) === 0) {
    const { error: deleteEmpleadoError } = await supabase
      .from("empleados")
      .delete()
      .eq("id", empleadoId);

    if (deleteEmpleadoError) throw deleteEmpleadoError;
  }

  return true;
};