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

/* ===========================
   Context Provider
=========================== */
export const AppProvider = ({ children }) => {
  // SESIÓN APP
  const [usuario, setUsuario] = useState(null); // "admin" | "residente" | null
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  // DATOS GLOBALES
  const [egresos, setEgresos] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [personal, setPersonal] = useState([]);

  const [loadingProyectos, setLoadingProyectos] = useState(true);
  const [loadingEgresos, setLoadingEgresos] = useState(true);
  const [loadingPersonal, setLoadingPersonal] = useState(true);

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
    } = supabase.auth.onAuthStateChange((event, session) => {
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

  if (error) {
    throw error;
  }

  saveAppSession("admin", "Administrador");
  return data;
};

  const loginResidente = async (nombre) => {
  const nombreLimpio = String(nombre || "").trim();
  const email = buildResidentEmail(nombreLimpio);

  // 1) Asegurar usuario Auth desde función server-side
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

  // 2) Login normal con Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: RESIDENTE_PASSWORD,
  });

  if (error) {
    throw error;
  }

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

  useEffect(() => {
    cargarProyectos();
    cargarEgresos();
    cargarPersonal();
  }, []);

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

    setProyectos((prev) =>
      (prev || []).map((p) => (p.id === id ? data : p))
    );

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

    setPersonal((prev) =>
      (prev || []).map((p) => (p.id === id ? normalizado : p))
    );

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
    };

    setEgresos((prev) => [normalizado, ...(prev || [])]);
    return normalizado;
  };

  const updateEgreso = async (id, patch, customActor) => {
    const a = customActor || actor;

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

      cargo: norm(patch?.cargo),
      asistio: typeof patch?.asistio === "boolean" ? patch.asistio : null,
      num_horas_extras: safeNum(patch?.numHorasExtras ?? patch?.num_horas_extras),
      valores_pendientes: safeNum(patch?.valoresPendientes ?? patch?.valores_pendientes),
      descuentos: safeNum(patch?.descuentos),

      actualizado_por: norm(a?.name),
      actualizado_por_rol: norm(a?.role),
    };

    const { data, error } = await supabase
      .from("egresos")
      .update(egresoPatch)
      .eq("id", id)
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
    };

    setEgresos((prev) =>
      (prev || []).map((e) => (e.id === id ? normalizado : e))
    );

    return normalizado;
  };

  const deleteEgreso = async (id) => {
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

        loadingProyectos,
        loadingEgresos,
        loadingPersonal,

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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);