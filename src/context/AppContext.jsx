import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const AppContext = createContext();

/* ===========================
   Helpers
=========================== */
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

const ensureISODate = (d) => String(d || "").slice(0, 10);

const slugifyName = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");

const buildResidentEmail = (nombre) => {
  const slug = slugifyName(nombre);
  return `${slug}@blendfortdemo.com`;
};

const ADMIN_EMAIL = "admin@blendfortdemo.com";
const ADMIN_PASSWORD = "Blendfortadmin";
const RESIDENTE_PASSWORD = "Blendfort2026";

const getCajaChicaEstado = (montoAsignado, gastadoActual) => {
  const monto = safeNum(montoAsignado);
  const gastado = safeNum(gastadoActual);
  const saldo = monto - gastado;

  if (monto <= 0) {
    return {
      estado: "SIN FONDO",
      saldo,
      gastado,
      monto,
    };
  }

  if (saldo < 0) {
    return {
      estado: "EXCEDIDA",
      saldo,
      gastado,
      monto,
    };
  }

  if (saldo === 0) {
    return {
      estado: "AGOTADA",
      saldo,
      gastado,
      monto,
    };
  }

  const ratio = monto > 0 ? saldo / monto : 0;

  if (ratio <= 0.2) {
    return {
      estado: "POR AGOTARSE",
      saldo,
      gastado,
      monto,
    };
  }

  return {
    estado: "DISPONIBLE",
    saldo,
    gastado,
    monto,
  };
};

const recalcularCajaChicaProyecto = async (proyecto) => {
  const proyectoN = norm(proyecto);
  if (!proyectoN) return null;

  const { data: caja, error: cajaError } = await supabase
    .from("caja_chica_proyecto")
    .select("*")
    .eq("proyecto", proyectoN)
    .maybeSingle();

  if (cajaError) throw cajaError;
  if (!caja?.id) return null;

  const { data: movimientos, error: movimientosError } = await supabase
    .from("movimientos_caja_chica")
    .select("valor")
    .eq("caja_chica_proyecto_id", caja.id);

  if (movimientosError) throw movimientosError;

  const gastadoActual = (movimientos || []).reduce(
    (acc, m) => acc + safeNum(m?.valor),
    0
  );

  const estadoCalc = getCajaChicaEstado(
    safeNum(caja.monto_actual_asignado),
    gastadoActual
  );

  const { data: cajaData, error: updateError } = await supabase
    .from("caja_chica_proyecto")
    .update({
      gastado_actual: gastadoActual,
      saldo_actual: estadoCalc.saldo,
      estado: estadoCalc.estado,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caja.id)
    .select()
    .single();

  if (updateError) throw updateError;

  const cajaNormalizada = {
    ...cajaData,
    proyecto: norm(cajaData.proyecto),
    residente: norm(cajaData.residente),
    montoActualAsignado: safeNum(cajaData.monto_actual_asignado),
    gastadoActual: safeNum(cajaData.gastado_actual),
    saldoActual: safeNum(cajaData.saldo_actual),
    fechaUltimoDesembolso: cajaData.fecha_ultimo_desembolso || "",
    creadoPor: cajaData.creado_por ?? "",
    creadoPorRol: cajaData.creado_por_rol ?? "",
  };

  setCajaChicaProyecto((prev) => {
    const existe = (prev || []).some((c) => c.id === cajaNormalizada.id);

    if (!existe) {
      return [cajaNormalizada, ...(prev || [])];
    }

    return (prev || []).map((c) =>
      c.id === cajaNormalizada.id ? cajaNormalizada : c
    );
  });

  return cajaNormalizada;
};

/* ===========================
   Context Provider
=========================== */
export const AppProvider = ({ children }) => {
  // SESIÓN APP
  const [usuario, setUsuario] = useState(null);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  // DATOS GLOBALES
  const [egresos, setEgresos] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [personal, setPersonal] = useState([]);

  // CAJA CHICA
  const [cajaChicaProyecto, setCajaChicaProyecto] = useState([]);
  const [cajaChicaDesembolsos, setCajaChicaDesembolsos] = useState([]);
  const [movimientosCajaChica, setMovimientosCajaChica] = useState([]);

  const [loadingProyectos, setLoadingProyectos] = useState(true);
  const [loadingEgresos, setLoadingEgresos] = useState(true);
  const [loadingPersonal, setLoadingPersonal] = useState(true);
  const [loadingCajaChicaProyecto, setLoadingCajaChicaProyecto] = useState(true);
  const [loadingCajaChicaDesembolsos, setLoadingCajaChicaDesembolsos] = useState(true);
  const [loadingMovimientosCajaChica, setLoadingMovimientosCajaChica] = useState(true);

  /* ===========================
     Sesión Supabase + sesión app
  =========================== */
  const saveAppSession = (tipo, nombre = "") => {
    const t = String(tipo || "").toLowerCase().trim();
    const n = String(nombre || "").trim();

    setUsuario(t);
    setNombreUsuario(n);

    localStorage.setItem(
      "blendfort_app_session",
      JSON.stringify({
        usuario: t,
        nombreUsuario: n,
      })
    );
  };

  const clearAppSession = () => {
    setUsuario(null);
    setNombreUsuario("");
    localStorage.removeItem("blendfort_app_session");
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data?.session;
        const savedAppSession = localStorage.getItem("blendfort_app_session");

        if (session && savedAppSession) {
          const parsed = JSON.parse(savedAppSession);
          if (mounted) {
            setUsuario(parsed?.usuario || null);
            setNombreUsuario(parsed?.nombreUsuario || "");
          }
        } else if (!session) {
          localStorage.removeItem("blendfort_app_session");
          if (mounted) {
            setUsuario(null);
            setNombreUsuario("");
          }
        }
      } catch (error) {
        console.error("Error inicializando auth:", error);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        clearAppSession();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ===========================
     Login con Supabase Auth
  =========================== */
  const loginAdmin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (error) throw error;

    saveAppSession("admin", "Administrador");
    return data;
  };

  const loginResidente = async (nombre) => {
    const nombreLimpio = String(nombre || "").trim();
    const email = buildResidentEmail(nombreLimpio);

    const ensureRes = await fetch("/api/ensure-resident-auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nombre: nombreLimpio }),
    });

    const ensureJson = await ensureRes.json();

    if (!ensureRes.ok) {
      throw new Error(ensureJson?.error || "No se pudo preparar el acceso del residente");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: RESIDENTE_PASSWORD,
    });

    if (error) throw error;

    saveAppSession("residente", nombreLimpio);
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    clearAppSession();
  };

  const actor = useMemo(() => {
    const role = usuario === "admin" ? "ADMIN" : usuario === "residente" ? "RESIDENTE" : "";
    const name = usuario === "admin" ? "ADMIN" : norm(nombreUsuario);
    const display = usuario === "admin" ? "ADMINISTRACIÓN" : norm(nombreUsuario);
    return { role, name, display };
  }, [usuario, nombreUsuario]);

  /* ===========================
     CARGAR PROYECTOS
  =========================== */
  const cargarProyectos = async () => {
    try {
      setLoadingProyectos(true);

      const { data, error } = await supabase
        .from("proyectos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProyectos(data || []);
    } catch (error) {
      console.error("Error cargando proyectos:", error);
    } finally {
      setLoadingProyectos(false);
    }
  };

  /* ===========================
     CARGAR EGRESOS
  =========================== */
  const cargarEgresos = async () => {
    try {
      setLoadingEgresos(true);

      const { data, error } = await supabase
        .from("egresos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalizados = (data || []).map((e) => ({
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
      }));

      setEgresos(normalizados);
    } catch (error) {
      console.error("Error cargando egresos:", error);
    } finally {
      setLoadingEgresos(false);
    }
  };

  /* ===========================
     CARGAR PERSONAL
  =========================== */
  const cargarPersonal = async () => {
    try {
      setLoadingPersonal(true);

      const { data, error } = await supabase
        .from("personal")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalizados = (data || []).map((p) => ({
        ...p,
        valorDia: p.valor_dia ?? p.valorDia ?? 0,
        valorHoraExtra: p.valor_hora_extra ?? p.valorHoraExtra ?? 0,
        salarioMensual: p.salario_mensual ?? p.salarioMensual ?? 0,
        fechaContratacion: p.fecha_contratacion ?? p.fechaContratacion ?? "",
      }));

      setPersonal(normalizados);
    } catch (error) {
      console.error("Error cargando personal:", error);
    } finally {
      setLoadingPersonal(false);
    }
  };

  /* ===========================
     CARGAR CAJA CHICA
  =========================== */
  const cargarCajaChicaProyecto = async () => {
    try {
      setLoadingCajaChicaProyecto(true);

      const { data, error } = await supabase
        .from("caja_chica_proyecto")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const normalizados = (data || []).map((c) => ({
        ...c,
        proyecto: norm(c.proyecto),
        residente: norm(c.residente),
        montoActualAsignado: safeNum(c.monto_actual_asignado),
        gastadoActual: safeNum(c.gastado_actual),
        saldoActual: safeNum(c.saldo_actual),
        fechaUltimoDesembolso: c.fecha_ultimo_desembolso || "",
        creadoPor: c.creado_por ?? "",
        creadoPorRol: c.creado_por_rol ?? "",
      }));

      setCajaChicaProyecto(normalizados);
    } catch (error) {
      console.error("Error cargando caja chica por proyecto:", error);
    } finally {
      setLoadingCajaChicaProyecto(false);
    }
  };

  const cargarCajaChicaDesembolsos = async () => {
    try {
      setLoadingCajaChicaDesembolsos(true);

      const { data, error } = await supabase
        .from("caja_chica_desembolsos")
        .select("*")
        .order("fecha_desembolso", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalizados = (data || []).map((d) => ({
        ...d,
        proyecto: norm(d.proyecto),
        residente: norm(d.residente),
        fechaDesembolso: d.fecha_desembolso || "",
        montoDesembolsado: safeNum(d.monto_desembolsado),
        saldoFinalAntesReposicion: safeNum(d.saldo_final_antes_reposicion),
        estadoAntes: norm(d.estado_antes),
        estadoNuevo: norm(d.estado_nuevo),
        creadoPor: d.creado_por ?? "",
        creadoPorRol: d.creado_por_rol ?? "",
      }));

      setCajaChicaDesembolsos(normalizados);
    } catch (error) {
      console.error("Error cargando desembolsos de caja chica:", error);
    } finally {
      setLoadingCajaChicaDesembolsos(false);
    }
  };

  const cargarMovimientosCajaChica = async () => {
    try {
      setLoadingMovimientosCajaChica(true);

      const { data, error } = await supabase
        .from("movimientos_caja_chica")
        .select("*")
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalizados = (data || []).map((m) => ({
        ...m,
        proyecto: norm(m.proyecto),
        fecha: m.fecha || "",
        concepto: norm(m.concepto),
        categoria: norm(m.categoria),
        valor: safeNum(m.valor),
        creadoPor: m.creado_por ?? "",
        creadoPorRol: m.creado_por_rol ?? "",
      }));

      setMovimientosCajaChica(normalizados);
    } catch (error) {
      console.error("Error cargando movimientos de caja chica:", error);
    } finally {
      setLoadingMovimientosCajaChica(false);
    }
  };

  useEffect(() => {
  if (authLoading) return;

  if (!usuario) {
    setProyectos([]);
    setEgresos([]);
    setPersonal([]);
    setCajaChicaProyecto([]);
    setCajaChicaDesembolsos([]);
    setMovimientosCajaChica([]);

    setLoadingProyectos(false);
    setLoadingEgresos(false);
    setLoadingPersonal(false);
    setLoadingCajaChicaProyecto(false);
    setLoadingCajaChicaDesembolsos(false);
    setLoadingMovimientosCajaChica(false);
    return;
  }

  cargarProyectos();
  cargarEgresos();
  cargarPersonal();
  cargarCajaChicaProyecto();
  cargarCajaChicaDesembolsos();
  cargarMovimientosCajaChica();
}, [authLoading, usuario]);

  /* ===========================
     CRUD PROYECTOS
  =========================== */
  const addProyecto = async (payload) => {
    const proyectoFinal = {
      nombre: norm(payload?.nombre),
      residente: norm(payload?.residente),
      dueno: norm(payload?.dueno),
      ubicacion: norm(payload?.ubicacion),
      tiempo: norm(payload?.tiempo),
      presupuesto: safeNum(payload?.presupuesto),
    };

    const { data, error } = await supabase
      .from("proyectos")
      .insert([proyectoFinal])
      .select()
      .single();

    if (error) throw error;

    setProyectos((prev) => [data, ...(prev || [])]);
    return data;
  };

  const updateProyecto = async (id, payload) => {
    const proyectoFinal = {
      nombre: norm(payload?.nombre),
      residente: norm(payload?.residente),
      dueno: norm(payload?.dueno),
      ubicacion: norm(payload?.ubicacion),
      tiempo: norm(payload?.tiempo),
      presupuesto: safeNum(payload?.presupuesto),
    };

    const { data, error } = await supabase
      .from("proyectos")
      .update(proyectoFinal)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    setProyectos((prev) => (prev || []).map((p) => (p.id === id ? data : p)));
    return data;
  };

  const deleteProyecto = async (id) => {
    const { error } = await supabase
      .from("proyectos")
      .delete()
      .eq("id", id);

    if (error) throw error;

    setProyectos((prev) => (prev || []).filter((p) => p.id !== id));
  };

  /* ===========================
     CRUD PERSONAL
  =========================== */
  const addPersonal = async (payload) => {
    const personalFinal = {
      nombre: norm(payload?.nombre),
      rol: norm(payload?.rol || "OPERARIO"),
      cargo: norm(payload?.cargo),
      tipo: norm(payload?.tipo || "CAMPO"),
      proyecto: norm(payload?.proyecto),
      valor_dia: safeNum(payload?.valorDia ?? payload?.valor_dia),
      salario_mensual: safeNum(payload?.salarioMensual ?? payload?.salario_mensual),
      valor_hora_extra: safeNum(payload?.valorHoraExtra ?? payload?.valor_hora_extra),
      fecha_contratacion: payload?.fechaContratacion || payload?.fecha_contratacion || null,
      estado: norm(payload?.estado || "ACTIVO"),
    };

    const { data, error } = await supabase
      .from("personal")
      .insert([personalFinal])
      .select()
      .single();

    if (error) throw error;

    const normalizado = {
      ...data,
      valorDia: data.valor_dia ?? 0,
      valorHoraExtra: data.valor_hora_extra ?? 0,
      salarioMensual: data.salario_mensual ?? 0,
      fechaContratacion: data.fecha_contratacion ?? "",
    };

    setPersonal((prev) => [normalizado, ...(prev || [])]);
    return normalizado;
  };

  const updatePersonal = async (id, payload) => {
    const personalFinal = {
      nombre: norm(payload?.nombre),
      rol: norm(payload?.rol || "OPERARIO"),
      cargo: norm(payload?.cargo),
      tipo: norm(payload?.tipo || "CAMPO"),
      proyecto: norm(payload?.proyecto),
      valor_dia: safeNum(payload?.valorDia ?? payload?.valor_dia),
      salario_mensual: safeNum(payload?.salarioMensual ?? payload?.salario_mensual),
      valor_hora_extra: safeNum(payload?.valorHoraExtra ?? payload?.valor_hora_extra),
      fecha_contratacion: payload?.fechaContratacion || payload?.fecha_contratacion || null,
      estado: norm(payload?.estado || "ACTIVO"),
    };

    const { data, error } = await supabase
      .from("personal")
      .update(personalFinal)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    const normalizado = {
      ...data,
      valorDia: data.valor_dia ?? 0,
      valorHoraExtra: data.valor_hora_extra ?? 0,
      salarioMensual: data.salario_mensual ?? 0,
      fechaContratacion: data.fecha_contratacion ?? "",
    };

    setPersonal((prev) => (prev || []).map((p) => (p.id === id ? normalizado : p)));
    return normalizado;
  };

  const deletePersonal = async (id) => {
    const { error } = await supabase
      .from("personal")
      .delete()
      .eq("id", id);

    if (error) throw error;

    setPersonal((prev) => (prev || []).filter((p) => p.id !== id));
  };

  /* ===========================
     Proyectos asignados
  =========================== */
  const getProyectosAsignados = (nombreResidente) => {
    const me = norm(nombreResidente);

    return (proyectos || [])
      .filter((p) => {
        const r1 = norm(p?.residente);
        const rList = Array.isArray(p?.residentes) ? p.residentes.map(norm) : [];
        return r1 === me || rList.includes(me);
      })
      .map((p) => norm(p?.nombre))
      .filter(Boolean);
  };

  const puedeIngresarComoResidente = (nombreResidente) => {
    const list = getProyectosAsignados(nombreResidente);
    return Array.isArray(list) && list.length > 0;
  };

  /* ===========================
     Permisos
  =========================== */
  const canEditEgreso = (egreso, customActor) => {
    const a = customActor || actor;
    if (!egreso) return false;

    if (a?.role === "ADMIN") return true;

    const creadorRol = norm(egreso?.creadoPorRol || egreso?.creado_por_rol);
    const creador = norm(egreso?.creadoPor || egreso?.creado_por);

    return a?.role === "RESIDENTE" && creadorRol === "RESIDENTE" && creador === norm(a?.name);
  };

  const canDeleteEgreso = (egreso, customActor) => canEditEgreso(egreso, customActor);

  /* ===========================
     HELPERS CAJA CHICA
  =========================== */
  const getCajaChicaProyectoByProyecto = (proyecto) => {
    const p = norm(proyecto);
    return (cajaChicaProyecto || []).find((c) => norm(c.proyecto) === p) || null;
  };

  const getResumenCajaChica = (proyecto) => {
    const caja = getCajaChicaProyectoByProyecto(proyecto);

    if (!caja) {
      return {
        existe: false,
        proyecto: norm(proyecto),
        residente: "",
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
      proyecto: norm(caja.proyecto),
      residente: norm(caja.residente),
      montoActualAsignado: safeNum(caja.montoActualAsignado ?? caja.monto_actual_asignado),
      gastadoActual: safeNum(caja.gastadoActual ?? caja.gastado_actual),
      saldoActual: safeNum(caja.saldoActual ?? caja.saldo_actual),
      estado: norm(caja.estado || estadoCalc.estado),
      fechaUltimoDesembolso: caja.fechaUltimoDesembolso ?? caja.fecha_ultimo_desembolso ?? "",
    };
  };

  const getResumenesCajaChica = () => {
    return (proyectos || []).map((p) => getResumenCajaChica(p?.nombre));
  };

  /* ===========================
     CAJA CHICA: DESEMBOLSO
  =========================== */
  const registrarDesembolsoCajaChica = async (payload, customActor) => {
  const a = customActor || actor;

  const proyectoN = norm(payload?.proyecto);
  const fechaDesembolso = ensureISODate(
    payload?.fechaDesembolso || payload?.fecha_desembolso
  );
  const monto = safeNum(
    payload?.monto ?? payload?.montoDesembolsado ?? payload?.monto_desembolsado
  );

  const proyectoObj =
    (proyectos || []).find((p) => norm(p?.nombre) === proyectoN) || null;

  // Buscar el estado actual en la base, no solo en React state
  const { data: cajaActual, error: cajaActualError } = await supabase
    .from("caja_chica_proyecto")
    .select("*")
    .eq("proyecto", proyectoN)
    .maybeSingle();

  if (cajaActualError) throw cajaActualError;

  const residenteAuto = norm(
    payload?.residente || cajaActual?.residente || proyectoObj?.residente
  );

  const saldoAnterior = safeNum(cajaActual?.saldo_actual);
  const estadoAnterior = norm(cajaActual?.estado);
  const estadoNuevoCalc = getCajaChicaEstado(monto, 0);

  const desembolsoFinal = {
    proyecto: proyectoN,
    residente: residenteAuto,
    fecha_desembolso: fechaDesembolso,
    monto_desembolsado: monto,
    saldo_final_antes_reposicion: saldoAnterior,
    estado_antes: estadoAnterior || "SIN FONDO",
    estado_nuevo: estadoNuevoCalc.estado,
    observacion: norm(payload?.observacion),
    creado_por: norm(a?.name),
    creado_por_rol: norm(a?.role),
  };

  const { data: desembolsoData, error: desembolsoError } = await supabase
    .from("caja_chica_desembolsos")
    .insert([desembolsoFinal])
    .select()
    .single();

  if (desembolsoError) throw desembolsoError;

  const cajaPayload = {
    proyecto: proyectoN,
    residente: residenteAuto,
    monto_actual_asignado: monto,
    gastado_actual: 0,
    saldo_actual: monto,
    estado: estadoNuevoCalc.estado,
    fecha_ultimo_desembolso: fechaDesembolso,
    observacion: norm(payload?.observacion),
    creado_por: norm(a?.name),
    creado_por_rol: norm(a?.role),
    updated_at: new Date().toISOString(),
  };

  // Upsert: si existe por proyecto, actualiza; si no existe, inserta
  const { data: cajaData, error: cajaError } = await supabase
    .from("caja_chica_proyecto")
    .upsert([cajaPayload], { onConflict: "proyecto" })
    .select()
    .single();

  if (cajaError) throw cajaError;

  const cajaNormalizada = {
    ...cajaData,
    proyecto: norm(cajaData.proyecto),
    residente: norm(cajaData.residente),
    montoActualAsignado: safeNum(cajaData.monto_actual_asignado),
    gastadoActual: safeNum(cajaData.gastado_actual),
    saldoActual: safeNum(cajaData.saldo_actual),
    fechaUltimoDesembolso: cajaData.fecha_ultimo_desembolso || "",
    creadoPor: cajaData.creado_por ?? "",
    creadoPorRol: cajaData.creado_por_rol ?? "",
  };

  const desembolsoNormalizado = {
    ...desembolsoData,
    proyecto: norm(desembolsoData.proyecto),
    residente: norm(desembolsoData.residente),
    fechaDesembolso: desembolsoData.fecha_desembolso || "",
    montoDesembolsado: safeNum(desembolsoData.monto_desembolsado),
    saldoFinalAntesReposicion: safeNum(desembolsoData.saldo_final_antes_reposicion),
    estadoAntes: norm(desembolsoData.estado_antes),
    estadoNuevo: norm(desembolsoData.estado_nuevo),
    creadoPor: desembolsoData.creado_por ?? "",
    creadoPorRol: desembolsoData.creado_por_rol ?? "",
  };

  setCajaChicaProyecto((prev) => {
    const exists = (prev || []).some((c) => c.id === cajaNormalizada.id);
    if (exists) {
      return (prev || []).map((c) =>
        c.id === cajaNormalizada.id ? cajaNormalizada : c
      );
    }
    return [cajaNormalizada, ...(prev || [])];
  });

  setCajaChicaDesembolsos((prev) => [desembolsoNormalizado, ...(prev || [])]);

  return {
    caja: cajaNormalizada,
    desembolso: desembolsoNormalizado,
  };
};

  /* ===========================
     CAJA CHICA: MOVIMIENTO
  =========================== */
  const registrarMovimientoCajaChica = async (payload, customActor) => {
  const a = customActor || actor;

  const proyectoN = norm(payload?.proyecto);

  // 1) Buscar la caja chica real en la base, no en el estado local
  const { data: caja, error: cajaLookupError } = await supabase
    .from("caja_chica_proyecto")
    .select("*")
    .eq("proyecto", proyectoN)
    .maybeSingle();

  if (cajaLookupError) throw cajaLookupError;

  if (!caja?.id) {
    throw new Error("Este proyecto no tiene caja chica activa.");
  }

  const valorMovimiento = safeNum(payload?.valor);
  const fechaMovimiento = ensureISODate(payload?.fecha);

  const movimientoFinal = {
    caja_chica_proyecto_id: caja.id,
    egreso_id: payload?.egresoId ?? payload?.egreso_id ?? null,
    proyecto: proyectoN,
    fecha: fechaMovimiento,
    concepto: norm(payload?.concepto),
    categoria: norm(payload?.categoria),
    valor: valorMovimiento,
    creado_por: norm(a?.name),
    creado_por_rol: norm(a?.role),
  };

  const { data: movData, error: movError } = await supabase
    .from("movimientos_caja_chica")
    .insert([movimientoFinal])
    .select()
    .single();

  if (movError) throw movError;

  const nuevoGastado =
    safeNum(caja.gastado_actual) + valorMovimiento;

  const estadoCalc = getCajaChicaEstado(
    safeNum(caja.monto_actual_asignado),
    nuevoGastado
  );

  const updateCaja = {
    gastado_actual: nuevoGastado,
    saldo_actual: estadoCalc.saldo,
    estado: estadoCalc.estado,
    updated_at: new Date().toISOString(),
  };

  const { data: cajaData, error: cajaError } = await supabase
    .from("caja_chica_proyecto")
    .update(updateCaja)
    .eq("id", caja.id)
    .select()
    .single();

  if (cajaError) throw cajaError;

  const movimientoNormalizado = {
    ...movData,
    proyecto: norm(movData.proyecto),
    fecha: movData.fecha || "",
    concepto: norm(movData.concepto),
    categoria: norm(movData.categoria),
    valor: safeNum(movData.valor),
    creadoPor: movData.creado_por ?? "",
    creadoPorRol: movData.creado_por_rol ?? "",
  };

  const cajaNormalizada = {
    ...cajaData,
    proyecto: norm(cajaData.proyecto),
    residente: norm(cajaData.residente),
    montoActualAsignado: safeNum(cajaData.monto_actual_asignado),
    gastadoActual: safeNum(cajaData.gastado_actual),
    saldoActual: safeNum(cajaData.saldo_actual),
    fechaUltimoDesembolso: cajaData.fecha_ultimo_desembolso || "",
    creadoPor: cajaData.creado_por ?? "",
    creadoPorRol: cajaData.creado_por_rol ?? "",
  };

  setMovimientosCajaChica((prev) => [movimientoNormalizado, ...(prev || [])]);

  setCajaChicaProyecto((prev) => {
    const existe = (prev || []).some((c) => c.id === cajaNormalizada.id);

    if (!existe) {
      return [cajaNormalizada, ...(prev || [])];
    }

    return (prev || []).map((c) =>
      c.id === cajaNormalizada.id ? cajaNormalizada : c
    );
  });

  return {
    movimiento: movimientoNormalizado,
    caja: cajaNormalizada,
  };
};

  /* ===========================
     CRUD EGRESOS
  =========================== */
  const addEgreso = async (payload, customActor) => {
  const a = customActor || actor;

  const egresoFinal = {
    proyecto: norm(payload?.proyecto),
    residente: norm(payload?.residente),
    fecha: ensureISODate(payload?.fecha),
    categoria: norm(payload?.categoria),
    lugar: norm(payload?.lugar),
    concepto: norm(payload?.concepto),
    detalles: norm(payload?.detalles),

    metodo_pago: norm(payload?.metodoPago || payload?.metodo_pago),
    pagado_por: norm(payload?.pagadoPor || payload?.pagado_por),

    valor: safeNum(payload?.valor),
    tiene_factura: Boolean(payload?.tieneFactura ?? payload?.tiene_factura),
    factura: payload?.tieneFactura || payload?.tiene_factura ? "si" : "",
    estado: norm(payload?.estado || "PENDIENTE"),
    tipo_registro: norm(payload?.tipoRegistro || payload?.tipo_registro || "EGRESO"),
    fuente_fondos: norm(payload?.fuenteFondos || payload?.fuente_fondos || "GENERAL"),

    cargo: norm(payload?.cargo),
    asistio: typeof payload?.asistio === "boolean" ? payload.asistio : null,
    num_horas_extras: safeNum(payload?.numHorasExtras ?? payload?.num_horas_extras),
    valores_pendientes: safeNum(payload?.valoresPendientes ?? payload?.valores_pendientes),
    descuentos: safeNum(payload?.descuentos),

    creado_por: norm(a?.name),
    creado_por_rol: norm(a?.role),
    creado_por_nombre: norm(a?.display),
    actualizado_por: norm(a?.name),
    actualizado_por_rol: norm(a?.role),
  };

  const { data, error } = await supabase
    .from("egresos")
    .insert([egresoFinal])
    .select()
    .single();

  if (error) throw error;

  const normalizado = {
    ...data,
    metodoPago: data.metodo_pago ?? "",
    pagadoPor: data.pagado_por ?? "",
    tieneFactura:
      typeof data.tiene_factura === "boolean"
        ? data.tiene_factura
        : data.factura === "si",
    tipoRegistro: data.tipo_registro ?? "EGRESO",
    numHorasExtras: data.num_horas_extras ?? 0,
    valoresPendientes: data.valores_pendientes ?? 0,
    creadoPor: data.creado_por ?? "",
    creadoPorRol: data.creado_por_rol ?? "",
    creadoPorNombre: data.creado_por_nombre ?? "",
    actualizadoPor: data.actualizado_por ?? "",
    actualizadoPorRol: data.actualizado_por_rol ?? "",
    fuenteFondos: data.fuente_fondos ?? "GENERAL",
  };

  setEgresos((prev) => [normalizado, ...(prev || [])]);

 // Caja chica: intentar descontar, pero sin romper el egreso si falla
if (norm(normalizado.fuenteFondos) === "CAJA_CHICA") {
  try {
    await registrarMovimientoCajaChica(
      {
        egresoId: normalizado.id,
        proyecto: normalizado.proyecto,
        fecha: normalizado.fecha,
        concepto: normalizado.concepto,
        categoria: normalizado.categoria,
        valor: normalizado.valor,
      },
      a
    );
  } catch (movError) {
    console.error(
      "El egreso se guardó, pero falló el movimiento de caja chica:",
      movError?.message,
      movError?.details,
      movError?.hint,
      movError
    );
  }
}

  return normalizado;
};

  const updateEgreso = async (id, patch, customActor) => {
  const a = customActor || actor;

  // 1) Leer el egreso actual real antes de editar
  const { data: egresoAnterior, error: egresoAnteriorError } = await supabase
    .from("egresos")
    .select("*")
    .eq("id", id)
    .single();

  if (egresoAnteriorError) throw egresoAnteriorError;

  const fuenteAnterior = norm(
    egresoAnterior?.fuente_fondos ?? egresoAnterior?.fuenteFondos ?? "GENERAL"
  );
  const proyectoAnterior = norm(egresoAnterior?.proyecto);

  const egresoPatch = {
    proyecto: norm(patch?.proyecto),
    residente: norm(patch?.residente),
    fecha: ensureISODate(patch?.fecha),
    categoria: norm(patch?.categoria),
    lugar: norm(patch?.lugar),
    concepto: norm(patch?.concepto),
    detalles: norm(patch?.detalles),

    metodo_pago: norm(patch?.metodoPago || patch?.metodo_pago),
    pagado_por: norm(patch?.pagadoPor || patch?.pagado_por),

    valor: safeNum(patch?.valor),
    tiene_factura: Boolean(patch?.tieneFactura ?? patch?.tiene_factura),
    factura: patch?.tieneFactura || patch?.tiene_factura ? "si" : "",
    estado: norm(patch?.estado || "PENDIENTE"),
    tipo_registro: norm(patch?.tipoRegistro || patch?.tipo_registro || "EGRESO"),
    fuente_fondos: norm(patch?.fuenteFondos || patch?.fuente_fondos || "GENERAL"),

    cargo: norm(patch?.cargo),
    asistio: typeof patch?.asistio === "boolean" ? patch.asistio : null,
    num_horas_extras: safeNum(patch?.numHorasExtras ?? patch?.num_horas_extras),
    valores_pendientes: safeNum(patch?.valoresPendientes ?? patch?.valores_pendientes),
    descuentos: safeNum(patch?.descuentos),

    actualizado_por: norm(a?.name),
    actualizado_por_rol: norm(a?.role),
  };

  const fuenteNueva = norm(egresoPatch.fuente_fondos);
  const proyectoNuevo = norm(egresoPatch.proyecto);

  // 2) Si el egreso editado quedará usando caja chica,
  // validar antes que sí exista una caja activa en ese proyecto
  let cajaDestino = null;

  if (fuenteNueva === "CAJA_CHICA") {
    const { data: cajaData, error: cajaDestinoError } = await supabase
      .from("caja_chica_proyecto")
      .select("*")
      .eq("proyecto", proyectoNuevo)
      .maybeSingle();

    if (cajaDestinoError) throw cajaDestinoError;

    if (!cajaData?.id) {
      throw new Error("No existe caja chica activa para el proyecto seleccionado.");
    }

    cajaDestino = cajaData;
  }

  // 3) Actualizar el egreso
  const { data, error } = await supabase
    .from("egresos")
    .update(egresoPatch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // 4) Buscar si ya existe movimiento asociado a este egreso
  const { data: movimientoExistente, error: movimientoExistenteError } = await supabase
    .from("movimientos_caja_chica")
    .select("*")
    .eq("egreso_id", id)
    .maybeSingle();

  if (movimientoExistenteError) throw movimientoExistenteError;

  const proyectosARecalcular = new Set();

  if (fuenteAnterior === "CAJA_CHICA") {
    proyectosARecalcular.add(proyectoAnterior);
  }

  if (fuenteNueva === "CAJA_CHICA") {
    proyectosARecalcular.add(proyectoNuevo);
  }

  // 5) Reconciliar caja chica según el cambio
  if (fuenteAnterior === "CAJA_CHICA" && fuenteNueva === "CAJA_CHICA") {
    if (movimientoExistente?.id) {
      const { error: updateMovimientoError } = await supabase
        .from("movimientos_caja_chica")
        .update({
          caja_chica_proyecto_id: cajaDestino.id,
          proyecto: proyectoNuevo,
          fecha: ensureISODate(data.fecha),
          concepto: norm(data.concepto),
          categoria: norm(data.categoria),
          valor: safeNum(data.valor),
        })
        .eq("id", movimientoExistente.id);

      if (updateMovimientoError) throw updateMovimientoError;
    } else {
      const { error: insertMovimientoError } = await supabase
        .from("movimientos_caja_chica")
        .insert([
          {
            caja_chica_proyecto_id: cajaDestino.id,
            egreso_id: data.id,
            proyecto: proyectoNuevo,
            fecha: ensureISODate(data.fecha),
            concepto: norm(data.concepto),
            categoria: norm(data.categoria),
            valor: safeNum(data.valor),
            creado_por: norm(a?.name),
            creado_por_rol: norm(a?.role),
          },
        ]);

      if (insertMovimientoError) throw insertMovimientoError;
    }
  } else if (fuenteAnterior !== "CAJA_CHICA" && fuenteNueva === "CAJA_CHICA") {
    const { error: insertMovimientoError } = await supabase
      .from("movimientos_caja_chica")
      .insert([
        {
          caja_chica_proyecto_id: cajaDestino.id,
          egreso_id: data.id,
          proyecto: proyectoNuevo,
          fecha: ensureISODate(data.fecha),
          concepto: norm(data.concepto),
          categoria: norm(data.categoria),
          valor: safeNum(data.valor),
          creado_por: norm(a?.name),
          creado_por_rol: norm(a?.role),
        },
      ]);

    if (insertMovimientoError) throw insertMovimientoError;
  } else if (fuenteAnterior === "CAJA_CHICA" && fuenteNueva !== "CAJA_CHICA") {
    if (movimientoExistente?.id) {
      const { error: deleteMovimientoError } = await supabase
        .from("movimientos_caja_chica")
        .delete()
        .eq("id", movimientoExistente.id);

      if (deleteMovimientoError) throw deleteMovimientoError;
    }
  }

  // 6) Recalcular las cajas afectadas con base en movimientos reales
  const proyectosValidos = [...proyectosARecalcular].filter(Boolean);

  for (const proyecto of proyectosValidos) {
    await recalcularCajaChicaProyecto(proyecto);
  }

  // 7) Recargar movimientos para que el frontend quede coherente
  await cargarMovimientosCajaChica();

  const normalizado = {
    ...data,
    metodoPago: data.metodo_pago ?? "",
    pagadoPor: data.pagado_por ?? "",
    tieneFactura:
      typeof data.tiene_factura === "boolean"
        ? data.tiene_factura
        : data.factura === "si",
    tipoRegistro: data.tipo_registro ?? "EGRESO",
    numHorasExtras: data.num_horas_extras ?? 0,
    valoresPendientes: data.valores_pendientes ?? 0,
    creadoPor: data.creado_por ?? "",
    creadoPorRol: data.creado_por_rol ?? "",
    creadoPorNombre: data.creado_por_nombre ?? "",
    actualizadoPor: data.actualizado_por ?? "",
    actualizadoPorRol: data.actualizado_por_rol ?? "",
    fuenteFondos: data.fuente_fondos ?? "GENERAL",
  };

  setEgresos((prev) => (prev || []).map((e) => (e.id === id ? normalizado : e)));
  return normalizado;
};

  const deleteEgreso = async (id) => {
  const { data: egresoActual, error: egresoActualError } = await supabase
    .from("egresos")
    .select("*")
    .eq("id", id)
    .single();

  if (egresoActualError) throw egresoActualError;

  const fuenteActual = norm(
    egresoActual?.fuente_fondos ?? egresoActual?.fuenteFondos ?? "GENERAL"
  );

  if (fuenteActual === "CAJA_CHICA") {
    throw new Error(
      "Por ahora no se permite eliminar egresos de caja chica. Primero cambia la fuente de fondos o haz la reversión de forma controlada."
    );
  }

  const { error } = await supabase
    .from("egresos")
    .delete()
    .eq("id", id);

  if (error) throw error;

  setEgresos((prev) => (prev || []).filter((e) => e.id !== id));
};

  const addReporteDiario = async (payload, customActor) => {
    return addEgreso(
      {
        ...payload,
        categoria: "MANO DE OBRA",
        tipoRegistro: "REPORTE_DIARIO",
        estado: payload?.estado ? payload.estado : "PENDIENTE",
      },
      customActor
    );
  };

  const updateReporteDiario = async (id, patch, customActor) => {
    return updateEgreso(
      id,
      {
        ...patch,
        categoria: "MANO DE OBRA",
        tipoRegistro: "REPORTE_DIARIO",
      },
      customActor
    );
  };

  return (
    <AppContext.Provider
      value={{
        usuario,
        nombreUsuario,
        authLoading,
        loginAdmin,
        loginResidente,
        logout,
        actor,

        egresos,
        setEgresos,
        proyectos,
        setProyectos,
        personal,
        setPersonal,

        cajaChicaProyecto,
        setCajaChicaProyecto,
        cajaChicaDesembolsos,
        setCajaChicaDesembolsos,
        movimientosCajaChica,
        setMovimientosCajaChica,

        loadingProyectos,
        loadingEgresos,
        loadingPersonal,
        loadingCajaChicaProyecto,
        loadingCajaChicaDesembolsos,
        loadingMovimientosCajaChica,

        norm,
        getProyectosAsignados,
        puedeIngresarComoResidente,

        canEditEgreso,
        canDeleteEgreso,

        cargarEgresos,
        addEgreso,
        updateEgreso,
        deleteEgreso,
        addReporteDiario,
        updateReporteDiario,

        cargarProyectos,
        addProyecto,
        updateProyecto,
        deleteProyecto,

        cargarPersonal,
        addPersonal,
        updatePersonal,
        deletePersonal,

        cargarCajaChicaProyecto,
        cargarCajaChicaDesembolsos,
        cargarMovimientosCajaChica,
        getCajaChicaProyectoByProyecto,
        getResumenCajaChica,
        getResumenesCajaChica,
        registrarDesembolsoCajaChica,
        registrarMovimientoCajaChica,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);