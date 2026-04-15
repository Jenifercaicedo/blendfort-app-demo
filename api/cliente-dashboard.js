import { createClient } from "@supabase/supabase-js";

const normalize = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || "";
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function getSupabaseAdmin() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  if (!supabaseUrl) {
    throw new Error("FALTA SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("FALTA SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "MÉTODO NO PERMITIDO" });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    const proyectoId = String(body?.proyectoId || "").trim();
    const codigoAcceso = normalize(body?.codigoAcceso || body?.codigo);

    if (!proyectoId) {
      return res.status(400).json({ error: "PROYECTO REQUERIDO" });
    }

    if (!codigoAcceso) {
      return res.status(400).json({ error: "CÓDIGO DE ACCESO REQUERIDO" });
    }

    const { data: acceso, error: accesoError } = await supabaseAdmin
      .from("cliente_accesos")
      .select("*")
      .eq("proyecto_id", proyectoId)
      .eq("codigo_acceso", codigoAcceso)
      .eq("activo", true)
      .maybeSingle();

    if (accesoError) throw accesoError;

    if (!acceso?.id) {
      return res.status(403).json({ error: "ACCESO CLIENTE NO AUTORIZADO" });
    }

    const { data: proyecto, error: proyectoError } = await supabaseAdmin
      .from("proyectos")
      .select("*")
      .eq("id", proyectoId)
      .maybeSingle();

    if (proyectoError) throw proyectoError;

    if (!proyecto?.id) {
      return res.status(404).json({ error: "PROYECTO NO ENCONTRADO" });
    }

    const nombreProyecto = normalize(proyecto?.nombre);

    const { data: egresos, error: egresosError } = await supabaseAdmin
      .from("egresos")
      .select("*")
      .eq("proyecto", nombreProyecto)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    if (egresosError) throw egresosError;

    return res.status(200).json({
      ok: true,
      acceso: {
        id: acceso.id,
        proyectoId: acceso.proyecto_id,
        nombreCliente: acceso.nombre_cliente,
        codigoAcceso: acceso.codigo_acceso,
        activo: Boolean(acceso.activo),
      },
      proyecto,
      egresos: egresos || [],
    });
  } catch (error) {
    console.error("[cliente-dashboard] error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        error?.details ||
        error?.hint ||
        "NO SE PUDO CARGAR EL DASHBOARD DEL CLIENTE",
    });
  }
}