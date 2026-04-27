import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  normalizeEgreso,
  normalizeCajaChicaProyecto,
  normalizeCajaChicaDesembolso,
  normalizeMovimientoCajaChica,
} from "../utils/normalizers";
import {
  cargarCajaChicaResidenteDB,
  getCajaChicaResidenteByNombreLocal,
  getResumenCajaChicaResidenteLocal,
  getResumenesCajaChicaResidenteLocal,
  registrarDesembolsoCajaChicaResidenteDB,
  registrarMovimientoCajaChicaResidenteDB,
  ajustarCajaChicaResidentePorDeltaDB,
  revertirMovimientoCajaChicaResidentePorEgresoDB,
} from "../features/cajaChica/cajaChicaResidente";
import {
  cargarPersonalMultiproyectoDB,
  agruparPersonalMultiproyecto,
  addPersonalMultiproyectoDB,
  updatePersonalMultiproyectoDB,
  toggleEstadoAsignacionMultiproyectoDB,
  deleteAsignacionMultiproyectoDB,
} from "../features/personal/personalMultiproyecto";
import { asegurarAsignacionResidentePrincipalDB } from "../features/personal/syncProyectoResidente";

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

  // NUEVO MODELO BASE
  const [profiles, setProfiles] = useState([]);
  const [catalogoCargos, setCatalogoCargos] = useState([]);
  const [proyectoResidentes, setProyectoResidentes] = useState([]);

  // CAJA CHICA
  const [cajaChicaProyecto, setCajaChicaProyecto] = useState([]);
  const [cajaChicaDesembolsos, setCajaChicaDesembolsos] = useState([]);
  const [movimientosCajaChica, setMovimientosCajaChica] = useState([]);
  const [cajaChicaResidente, setCajaChicaResidente] = useState([]);

  const [loadingProyectos, setLoadingProyectos] = useState(true);
  const [loadingEgresos, setLoadingEgresos] = useState(true);
  const [loadingPersonal, setLoadingPersonal] = useState(true);

  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingCatalogoCargos, setLoadingCatalogoCargos] = useState(true);
  const [loadingProyectoResidentes, setLoadingProyectoResidentes] = useState(true);

  const [loadingCajaChicaProyecto, setLoadingCajaChicaProyecto] = useState(true);
  const [loadingCajaChicaDesembolsos, setLoadingCajaChicaDesembolsos] = useState(true);
  const [loadingMovimientosCajaChica, setLoadingMovimientosCajaChica] = useState(true);
  const [loadingCajaChicaResidente, setLoadingCajaChicaResidente] = useState(true);

  /* ===========================
     CAJA CHICA RESIDENTE
     AppContext decide si afecta.
     La DB recalcula saldo/estado.
  =========================== */
  const shouldAffectResidentCajaChica = (egreso) => {
    const fuenteFondos = norm(egreso?.fuenteFondos ?? egreso?.fuente_fondos);
    const categoria = norm(egreso?.categoria);
    const tipoRegistro = norm(egreso?.tipoRegistro ?? egreso?.tipo_registro);
    const estado = norm(egreso?.estado || "PENDIENTE");

    if (estado === "ANULADO") return false;
    if (fuenteFondos !== "CAJA_CHICA") return false;
    if (categoria === "MANO DE OBRA") return false;
    if (tipoRegistro === "REPORTE_DIARIO") return false;

    return true;
  };

  const resolveResidentNameForCaja = (egreso) => {
    return (
      egreso?.residente ||
      egreso?.creadoPorNombre ||
      egreso?.creado_por_nombre ||
      nombreUsuario ||
      ""
    )
      .toString()
      .trim();
  };

  const reconcileMovimientoCajaChicaResidente = async (egreso, customActor) => {
    const a = customActor || actor;
    if (!egreso?.id) return;

    await revertirMovimientoCajaChicaResidentePorEgresoDB(egreso.id);

    if (!shouldAffectResidentCajaChica(egreso)) {
      await Promise.all([cargarCajaChicaResidente(), cargarMovimientosCajaChica()]);
      return;
    }

    await registrarMovimientoCajaChicaResidenteDB({
      payload: {
        egresoId: egreso.id,
        residente: resolveResidentNameForCaja(egreso),
        proyecto: egreso.proyecto,
        fecha: egreso.fecha,
        concepto: egreso.concepto,
        categoria: egreso.categoria,
        valor: safeNum(egreso.valor),
      },
      actor: a,
    });

    await Promise.all([cargarCajaChicaResidente(), cargarMovimientosCajaChica()]);
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

    const { data: egresosCaja, error: egresosCajaError } = await supabase
      .from("egresos")
      .select("valor, estado, fuente_fondos, proyecto, categoria, tipo_registro")
      .eq("proyecto", proyectoN)
      .eq("fuente_fondos", "CAJA_CHICA");

    if (egresosCajaError) throw egresosCajaError;

    const gastadoActual = (egresosCaja || []).reduce((acc, eg) => {
      const estado = norm(eg?.estado || "PENDIENTE");
      const categoria = norm(eg?.categoria);
      const tipoRegistro = norm(eg?.tipo_registro);

      if (estado === "ANULADO") return acc;
      if (categoria === "MANO DE OBRA") return acc;
      if (tipoRegistro === "REPORTE_DIARIO") return acc;

      return acc + safeNum(eg?.valor);
    }, 0);

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

    return normalizeCajaChicaProyecto(cajaData);
  };

  const recalcularCajaChicaResidente = async (residente) => {
    const normalizados = await cargarCajaChicaResidenteDB();
    setCajaChicaResidente(normalizados);
    return getCajaChicaResidenteByNombreLocal(normalizados, residente);
  };

  const ajustarCajaChicaResidentePorDelta = async (residente, delta) => {
    const cajaActualizada = await ajustarCajaChicaResidentePorDeltaDB({
      residente,
      delta,
    });

    await cargarCajaChicaResidente();

    return cajaActualizada;
  };

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

      const normalizados = (data || []).map((e) => normalizeEgreso(e));
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

      const data = await cargarPersonalMultiproyectoDB();
      setPersonal(data || []);
    } catch (error) {
      console.error("Error cargando personal:", error);
    } finally {
      setLoadingPersonal(false);
    }
  };

  /* ===========================
     CARGAR PROFILES
  =========================== */
  const cargarProfiles = async () => {
    try {
      setLoadingProfiles(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre, rol, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProfiles(data || []);
    } catch (error) {
      console.error("Error cargando profiles:", error);
    } finally {
      setLoadingProfiles(false);
    }
  };

  /* ===========================
     CARGAR CATÁLOGO DE CARGOS
  =========================== */
  const cargarCatalogoCargos = async () => {
    try {
      setLoadingCatalogoCargos(true);

      const { data, error } = await supabase
        .from("catalogo_cargos")
        .select("*")
        .order("nombre", { ascending: true });

      if (error) throw error;

      setCatalogoCargos(data || []);
    } catch (error) {
      console.error("Error cargando catálogo de cargos:", error);
    } finally {
      setLoadingCatalogoCargos(false);
    }
  };

  /* ===========================
     CRUD CATÁLOGO DE CARGOS
  =========================== */
  const addCatalogoCargo = async (payload) => {
    const cargoFinal = {
      codigo: norm(payload?.codigo),
      nombre: norm(payload?.nombre),
      tipo_personal: norm(payload?.tipo_personal || payload?.tipoPersonal || "CAMPO"),
      tipo_pago: norm(payload?.tipo_pago || payload?.tipoPago || "DIARIO"),
      valor_dia: safeNum(payload?.valor_dia ?? payload?.valorDia),
      valor_hora_extra: safeNum(payload?.valor_hora_extra ?? payload?.valorHoraExtra),
      salario_mensual: safeNum(payload?.salario_mensual ?? payload?.salarioMensual),
      activo: payload?.activo !== false,
    };

    const { data, error } = await supabase
      .from("catalogo_cargos")
      .insert([cargoFinal])
      .select()
      .single();

    if (error) throw error;

    await cargarCatalogoCargos();
    return data;
  };

  const updateCatalogoCargo = async (id, payload) => {
    const cargoPatch = {
      codigo: norm(payload?.codigo),
      nombre: norm(payload?.nombre),
      tipo_personal: norm(payload?.tipo_personal || payload?.tipoPersonal || "CAMPO"),
      tipo_pago: norm(payload?.tipo_pago || payload?.tipoPago || "DIARIO"),
      valor_dia: safeNum(payload?.valor_dia ?? payload?.valorDia),
      valor_hora_extra: safeNum(payload?.valor_hora_extra ?? payload?.valorHoraExtra),
      salario_mensual: safeNum(payload?.salario_mensual ?? payload?.salarioMensual),
      activo: payload?.activo !== false,
    };

    const { data, error } = await supabase
      .from("catalogo_cargos")
      .update(cargoPatch)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await cargarCatalogoCargos();
    return data;
  };

  const toggleCatalogoCargoActivo = async (id, nextActivo) => {
    const { data, error } = await supabase
      .from("catalogo_cargos")
      .update({ activo: Boolean(nextActivo) })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await cargarCatalogoCargos();
    return data;
  };

  /* ===========================
     CARGAR RESIDENTES POR PROYECTO
  =========================== */
  const cargarProyectoResidentes = async () => {
    try {
      setLoadingProyectoResidentes(true);

      const { data, error } = await supabase
        .from("v_proyecto_residentes_activos")
        .select("*")
        .order("proyecto_nombre", { ascending: true });

      if (error) throw error;

      setProyectoResidentes(data || []);
    } catch (error) {
      console.error("Error cargando proyecto_residentes:", error);
    } finally {
      setLoadingProyectoResidentes(false);
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

      const normalizados = (data || []).map((c) => normalizeCajaChicaProyecto(c));
      setCajaChicaProyecto(normalizados);
    } catch (error) {
      console.error("Error cargando caja chica por proyecto:", error);
    } finally {
      setLoadingCajaChicaProyecto(false);
    }
  };

  const cargarCajaChicaResidente = async () => {
    try {
      setLoadingCajaChicaResidente(true);
      const normalizados = await cargarCajaChicaResidenteDB();
      setCajaChicaResidente(normalizados);
    } catch (error) {
      console.error("Error cargando caja chica por residente:", error);
    } finally {
      setLoadingCajaChicaResidente(false);
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

      const normalizados = (data || []).map((d) => normalizeCajaChicaDesembolso(d));
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

      const normalizados = (data || []).map((m) => normalizeMovimientoCajaChica(m));
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
      setProfiles([]);
      setCatalogoCargos([]);
      setProyectoResidentes([]);

      setCajaChicaProyecto([]);
      setCajaChicaResidente([]);
      setCajaChicaDesembolsos([]);
      setMovimientosCajaChica([]);

      setLoadingProyectos(false);
      setLoadingEgresos(false);
      setLoadingPersonal(false);
      setLoadingProfiles(false);
      setLoadingCatalogoCargos(false);
      setLoadingProyectoResidentes(false);

      setLoadingCajaChicaProyecto(false);
      setLoadingCajaChicaResidente(false);
      setLoadingCajaChicaDesembolsos(false);
      setLoadingMovimientosCajaChica(false);
      return;
    }

    cargarProyectos();
    cargarEgresos();
    cargarPersonal();
    cargarProfiles();
    cargarCatalogoCargos();
    cargarProyectoResidentes();

    cargarCajaChicaProyecto();
    cargarCajaChicaResidente();
    cargarCajaChicaDesembolsos();
    cargarMovimientosCajaChica();
  }, [authLoading, usuario]);

  /* ===========================
     MAPAS AUXILIARES NUEVOS
  =========================== */
  const profilesByNormalizedName = useMemo(() => {
    const map = new Map();

    for (const p of profiles || []) {
      const key = norm(p?.nombre);
      if (!key) continue;
      map.set(key, p);
    }

    return map;
  }, [profiles]);

  const proyectosById = useMemo(() => {
    const map = new Map();

    for (const p of proyectos || []) {
      if (!p?.id) continue;
      map.set(String(p.id), p);
    }

    return map;
  }, [proyectos]);

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

    try {
      await asegurarAsignacionResidentePrincipalDB({
        proyectoId: data.id,
        proyectoNombre: data.nombre,
        residenteNombre: data.residente,
      });
    } catch (syncError) {
      console.error(
        "Proyecto creado, pero no se pudo sincronizar la asignación del residente principal:",
        syncError
      );
    }

    await Promise.all([
      cargarProyectos(),
      cargarProyectoResidentes(),
      cargarPersonal(),
      cargarProfiles(),
    ]);

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

    try {
      await asegurarAsignacionResidentePrincipalDB({
        proyectoId: data.id,
        proyectoNombre: data.nombre,
        residenteNombre: data.residente,
      });
    } catch (syncError) {
      console.error(
        "Proyecto actualizado, pero no se pudo sincronizar la asignación del residente principal:",
        syncError
      );
    }

    await Promise.all([
      cargarProyectos(),
      cargarProyectoResidentes(),
      cargarPersonal(),
      cargarProfiles(),
    ]);

    return data;
  };

  const deleteProyecto = async (id) => {
    const { error } = await supabase
      .from("proyectos")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await Promise.all([
      cargarProyectos(),
      cargarProyectoResidentes(),
      cargarPersonal(),
      cargarProfiles(),
    ]);
  };

  /* ===========================
     CRUD PERSONAL
  =========================== */
  const addPersonal = async (payload) => {
    await addPersonalMultiproyectoDB(payload);
    await Promise.all([cargarPersonal(), cargarProyectoResidentes(), cargarProfiles()]);
    return true;
  };

  const updatePersonal = async (id, payload) => {
    await updatePersonalMultiproyectoDB(id, payload);
    await Promise.all([cargarPersonal(), cargarProyectoResidentes(), cargarProfiles()]);
    return true;
  };

  const toggleEstadoPersonal = async (id, nextEstado) => {
    await toggleEstadoAsignacionMultiproyectoDB(id, nextEstado);
    await Promise.all([cargarPersonal(), cargarProyectoResidentes(), cargarProfiles()]);
    return true;
  };

  const deletePersonal = async (id) => {
    await deleteAsignacionMultiproyectoDB(id);
    await Promise.all([cargarPersonal(), cargarProyectoResidentes(), cargarProfiles()]);
    return true;
  };

  /* ===========================
     PERSONAL AGRUPADO
  =========================== */
  const agruparPersonal = (lista = []) => {
    return agruparPersonalMultiproyecto(lista || []);
  };

  const getPersonalAgrupado = () => {
    return agruparPersonalMultiproyecto(personal || []);
  };

  const getEmpleadoAgrupado = (nombre) => {
    const nombreKey = norm(nombre);
    return agruparPersonalMultiproyecto(personal || []).find((e) => e.key === nombreKey) || null;
  };

  const getAsignacionesPorEmpleado = (nombre) => {
    const empleado = getEmpleadoAgrupado(nombre);
    return empleado?.asignaciones || [];
  };

  /* ===========================
     Residentes por proyecto
  =========================== */
  /* ===========================
   Residentes por proyecto
=========================== */
const getResidentAssignmentsFromPersonal = () => {
  return (personal || []).filter((row) => {
    const rol = norm(row?.rol);
    const estado = norm(row?.estado || "ACTIVO");
    const proyecto = norm(row?.proyecto);
    const nombre = norm(row?.nombre);

    if (!nombre) return false;
    if (!proyecto) return false;
    if (estado !== "ACTIVO") return false;

    return rol === "RESIDENTE";
  });
};

const getResidentesProyecto = (proyectoRef) => {
  let proyectoId = "";
  let proyectoLegacy = null;

  if (typeof proyectoRef === "string") {
    proyectoLegacy =
      (proyectos || []).find(
        (p) => norm(p?.nombre) === norm(proyectoRef) || String(p?.id) === String(proyectoRef)
      ) || null;
    proyectoId = proyectoLegacy?.id || "";
  } else if (proyectoRef?.id) {
    proyectoLegacy = proyectoRef;
    proyectoId = proyectoRef.id;
  }

  const residentesPorId = proyectoId
    ? (proyectoResidentes || []).filter(
        (r) => String(r?.proyecto_id) === String(proyectoId)
      )
    : [];

  const merged = [];
  const pushUnique = (item) => {
    const nombreKey = norm(item?.residente_nombre);
    if (!nombreKey) return;

    const yaExiste = merged.some((row) => norm(row?.residente_nombre) === nombreKey);
    if (yaExiste) return;

    merged.push(item);
  };

  // 1) Fuente principal actual: proyecto_residentes
  residentesPorId.forEach((r) => {
    pushUnique(r);
  });

  // 2) Fallback legacy desde tabla proyectos
  if (proyectoLegacy?.residente) {
    pushUnique({
      proyecto_id: proyectoLegacy.id,
      proyecto_nombre: proyectoLegacy.nombre,
      profile_id: null,
      residente_nombre: proyectoLegacy.residente,
      personal_id: null,
      personal_nombre: null,
      es_principal: true,
      activo: true,
      origen: "LEGACY_PRINCIPAL",
    });
  }

  if (Array.isArray(proyectoLegacy?.residentes)) {
    proyectoLegacy.residentes.forEach((r) => {
      const rNorm = norm(r);
      if (!rNorm) return;

      pushUnique({
        proyecto_id: proyectoLegacy?.id || null,
        proyecto_nombre: proyectoLegacy?.nombre || "",
        profile_id: null,
        residente_nombre: r,
        personal_id: null,
        personal_nombre: null,
        es_principal: false,
        activo: true,
        origen: "LEGACY_ADICIONAL",
      });
    });
  }

  // 3) NUEVO: residentes activos desde personal
  const proyectoNombreRef = norm(proyectoLegacy?.nombre || proyectoRef);

  getResidentAssignmentsFromPersonal()
    .filter((row) => norm(row?.proyecto) === proyectoNombreRef)
    .forEach((row) => {
      pushUnique({
        proyecto_id: proyectoLegacy?.id || null,
        proyecto_nombre: proyectoLegacy?.nombre || row?.proyecto || "",
        profile_id: null,
        residente_nombre: row?.nombre,
        personal_id: row?.id || null,
        personal_nombre: row?.nombre || null,
        es_principal: false,
        activo: true,
        origen: "PERSONAL_ACTIVO",
      });
    });

  if (merged.length > 0) {
    return merged.sort((a, b) => {
      if (Boolean(a?.es_principal) !== Boolean(b?.es_principal)) {
        return a?.es_principal ? -1 : 1;
      }
      return norm(a?.residente_nombre).localeCompare(norm(b?.residente_nombre));
    });
  }

  return [];
};

const getResidentePrincipalProyecto = (proyectoRef) => {
  const residentes = getResidentesProyecto(proyectoRef);
  const principal = residentes.find((r) => Boolean(r?.es_principal));

  if (principal) return principal;

  const proyecto =
    typeof proyectoRef === "object" && proyectoRef?.id
      ? proyectoRef
      : (proyectos || []).find(
          (p) =>
            norm(p?.nombre) === norm(proyectoRef) || String(p?.id) === String(proyectoRef)
        ) || null;

  if (!proyecto) return null;

  return proyecto?.residente
    ? {
        proyecto_id: proyecto.id,
        proyecto_nombre: proyecto.nombre,
        residente_nombre: proyecto.residente,
        es_principal: true,
        activo: true,
        origen: "LEGACY_FALLBACK",
      }
    : null;
};

/* ===========================
   Proyectos asignados
=========================== */
const getProyectosAsignados = (nombreResidente) => {
  const me = norm(nombreResidente);
  if (!me) return [];

  const profile = profilesByNormalizedName.get(me);

  const proyectosPorId = profile
    ? (proyectoResidentes || [])
        .filter((r) => String(r?.profile_id) === String(profile?.id))
        .map((r) => proyectosById.get(String(r?.proyecto_id)))
        .filter(Boolean)
        .map((p) => norm(p?.nombre))
    : [];

  const proyectosLegacy = (proyectos || [])
    .filter((p) => {
      const principalLegacy = norm(p?.residente);
      const residentesLegacy = Array.isArray(p?.residentes)
        ? p.residentes.map(norm)
        : [];

      return principalLegacy === me || residentesLegacy.includes(me);
    })
    .map((p) => norm(p?.nombre))
    .filter(Boolean);

  const proyectosDesdePersonal = getResidentAssignmentsFromPersonal()
    .filter((row) => norm(row?.nombre) === me)
    .map((row) => norm(row?.proyecto))
    .filter(Boolean);

  return [...new Set([...proyectosPorId, ...proyectosLegacy, ...proyectosDesdePersonal])];
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

    const estado = norm(egreso?.estado || "PENDIENTE");
    if (estado === "ANULADO") return false;

    if (a?.role === "ADMIN") return true;

    const creadorRol = norm(egreso?.creadoPorRol || egreso?.creado_por_rol);
    const creador = norm(egreso?.creadoPor || egreso?.creado_por);

    return a?.role === "RESIDENTE" && creadorRol === "RESIDENTE" && creador === norm(a?.name);
  };

  const canDeleteEgreso = (egreso, customActor) => {
    const a = customActor || actor;
    if (!egreso) return false;

    const estado = norm(egreso?.estado || "PENDIENTE");
    if (estado === "ANULADO") return false;

    if (a?.role === "ADMIN") return true;

    const creadorRol = norm(egreso?.creadoPorRol || egreso?.creado_por_rol);
    const creador = norm(egreso?.creadoPor || egreso?.creado_por);

    return a?.role === "RESIDENTE" && creadorRol === "RESIDENTE" && creador === norm(a?.name);
  };

  /* ===========================
     HELPERS CAJA CHICA
  =========================== */
  const getCajaChicaProyectoByProyecto = (proyecto) => {
    const p = norm(proyecto);
    return (cajaChicaProyecto || []).find((c) => norm(c.proyecto) === p) || null;
  };

  const getCajaChicaResidenteByNombre = (residente) => {
    return getCajaChicaResidenteByNombreLocal(cajaChicaResidente, residente);
  };

  const getResumenCajaChicaResidente = (residente) => {
    return getResumenCajaChicaResidenteLocal(cajaChicaResidente, residente);
  };

  const getResumenesCajaChicaResidente = () => {
    return getResumenesCajaChicaResidenteLocal(cajaChicaResidente);
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
  const registrarDesembolsoCajaChicaResidente = async (payload, customActor) => {
    const a = customActor || actor;

    const result = await registrarDesembolsoCajaChicaResidenteDB({
      payload,
      actor: a,
    });

    await Promise.all([
      cargarCajaChicaResidente(),
      cargarCajaChicaDesembolsos(),
      cargarCajaChicaProyecto(),
    ]);

    return result;
  };

  const registrarDesembolsoCajaChica = async (payload, customActor) => {
    const residenteN = norm(payload?.residente);

    if (residenteN) {
      return registrarDesembolsoCajaChicaResidente(payload, customActor);
    }

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

    const deudaArrastrada = saldoAnterior < 0 ? Math.abs(saldoAnterior) : 0;
    const gastadoNuevo = deudaArrastrada;
    const estadoNuevoCalc = getCajaChicaEstado(monto, gastadoNuevo);

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
      gastado_actual: gastadoNuevo,
      saldo_actual: estadoNuevoCalc.saldo,
      estado: estadoNuevoCalc.estado,
      fecha_ultimo_desembolso: fechaDesembolso,
      observacion: norm(payload?.observacion),
      creado_por: norm(a?.name),
      creado_por_rol: norm(a?.role),
      updated_at: new Date().toISOString(),
    };

    const { data: cajaData, error: cajaError } = await supabase
      .from("caja_chica_proyecto")
      .upsert([cajaPayload], { onConflict: "proyecto" })
      .select()
      .single();

    if (cajaError) throw cajaError;

    const cajaNormalizada = normalizeCajaChicaProyecto(cajaData);
    const desembolsoNormalizado = normalizeCajaChicaDesembolso(desembolsoData);

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

    const nuevoGastado = safeNum(caja.gastado_actual) + valorMovimiento;

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

    const movimientoNormalizado = normalizeMovimientoCajaChica(movData);
    const cajaNormalizada = normalizeCajaChicaProyecto(cajaData);

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

  const registrarMovimientoCajaChicaResidente = async (payload, customActor) => {
    const a = customActor || actor;

    const result = await registrarMovimientoCajaChicaResidenteDB({
      payload,
      actor: a,
    });

    await Promise.all([cargarCajaChicaResidente(), cargarMovimientosCajaChica()]);

    return result;
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

    const normalizado = normalizeEgreso(data);
    setEgresos((prev) => [normalizado, ...(prev || [])]);

    try {
      await reconcileMovimientoCajaChicaResidente(normalizado, a);
    } catch (movError) {
      console.error(
        "El egreso se guardó, pero falló el movimiento de caja chica del residente:",
        movError?.message || movError
      );
    }

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
      fuente_fondos: norm(patch?.fuenteFondos || patch?.fuente_fondos || "GENERAL"),

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

    const normalizado = normalizeEgreso(data);

    try {
      await reconcileMovimientoCajaChicaResidente(normalizado, a);
    } catch (movError) {
      console.error(
        "El egreso se actualizó, pero falló la reconciliación de caja chica del residente:",
        movError?.message || movError
      );
    }

    setEgresos((prev) => (prev || []).map((e) => (e.id === id ? normalizado : e)));
    return normalizado;
  };

  const deleteEgreso = async (id, customActor) => {
    const a = customActor || actor;

    const { data: egresoActual, error: egresoActualError } = await supabase
      .from("egresos")
      .select("*")
      .eq("id", id)
      .single();

    if (egresoActualError) throw egresoActualError;

    const estadoActual = norm(egresoActual?.estado || "PENDIENTE");
    if (estadoActual === "ANULADO") {
      throw new Error("Este egreso ya está anulado.");
    }

    const { data, error } = await supabase
      .from("egresos")
      .update({
        estado: "ANULADO",
        anulado_at: new Date().toISOString(),
        anulado_por: norm(a?.name),
        anulado_por_rol: norm(a?.role),
        actualizado_por: norm(a?.name),
        actualizado_por_rol: norm(a?.role),
        motivo_anulacion: "ANULACIÓN DESDE APP",
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    try {
      await revertirMovimientoCajaChicaResidentePorEgresoDB(id);
      await Promise.all([cargarCajaChicaResidente(), cargarMovimientosCajaChica()]);
    } catch (movError) {
      console.error(
        "El egreso se anuló, pero falló la reversa de caja chica del residente:",
        movError?.message || movError
      );
    }

    const normalizado = normalizeEgreso(data);
    setEgresos((prev) => (prev || []).map((e) => (e.id === id ? normalizado : e)));

    return normalizado;
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

        profiles,
        setProfiles,
        catalogoCargos,
        setCatalogoCargos,
        proyectoResidentes,
        setProyectoResidentes,

        cajaChicaProyecto,
        setCajaChicaProyecto,
        cajaChicaDesembolsos,
        setCajaChicaDesembolsos,
        movimientosCajaChica,
        setMovimientosCajaChica,

        loadingProyectos,
        loadingEgresos,
        loadingPersonal,
        loadingProfiles,
        loadingCatalogoCargos,
        loadingProyectoResidentes,
        loadingCajaChicaProyecto,
        loadingCajaChicaDesembolsos,
        loadingMovimientosCajaChica,

        norm,
        getProyectosAsignados,
        getResidentesProyecto,
        getResidentePrincipalProyecto,
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
        toggleEstadoPersonal,
        deletePersonal,
        getPersonalAgrupado,
        getEmpleadoAgrupado,
        getAsignacionesPorEmpleado,

        cargarProfiles,
        cargarCatalogoCargos,
        addCatalogoCargo,
        updateCatalogoCargo,
        toggleCatalogoCargoActivo,
        cargarProyectoResidentes,

        cargarCajaChicaProyecto,
        cargarCajaChicaDesembolsos,
        cargarMovimientosCajaChica,
        getCajaChicaProyectoByProyecto,
        getResumenCajaChica,
        getResumenesCajaChica,
        registrarDesembolsoCajaChica,
        registrarMovimientoCajaChica,

        cajaChicaResidente,
        setCajaChicaResidente,
        loadingCajaChicaResidente,
        cargarCajaChicaResidente,
        getCajaChicaResidenteByNombre,
        getResumenCajaChicaResidente,
        getResumenesCajaChicaResidente,
        recalcularCajaChicaResidente,
        registrarDesembolsoCajaChicaResidente,
        registrarMovimientoCajaChicaResidente,
        ajustarCajaChicaResidentePorDelta,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);