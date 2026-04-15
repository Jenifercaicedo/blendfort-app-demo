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

    const codigoAcceso = normalize(body?.codigoAcceso || body?.codigo);

    if (!codigoAcceso) {
      return res.status(400).json({ error: "CÓDIGO DE ACCESO REQUERIDO" });
    }

    const { data: acceso, error: accesoError } = await supabaseAdmin
      .from("cliente_accesos")
      .select("*")
      .eq("codigo_acceso", codigoAcceso)
      .eq("activo", true)
      .maybeSingle();

    if (accesoError) throw accesoError;

    if (!acceso?.id) {
      return res.status(401).json({ error: "CÓDIGO INVÁLIDO O INACTIVO" });
    }

    const { data: proyecto, error: proyectoError } = await supabaseAdmin
      .from("proyectos")
      .select("id, nombre, residente, dueno, ubicacion, tiempo, presupuesto")
      .eq("id", acceso.proyecto_id)
      .maybeSingle();

    if (proyectoError) throw proyectoError;

    if (!proyecto?.id) {
      return res.status(404).json({ error: "PROYECTO NO ENCONTRADO" });
    }

    return res.status(200).json({
      ok: true,
      session: {
        accesoId: acceso.id,
        proyectoId: acceso.proyecto_id,
        nombreCliente: acceso.nombre_cliente,
        codigoAcceso: acceso.codigo_acceso,
        activo: Boolean(acceso.activo),
      },
      proyecto,
    });
  } catch (error) {
    console.error("[cliente-login] error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        error?.details ||
        error?.hint ||
        "NO SE PUDO INICIAR SESIÓN DEL CLIENTE",
    });
  }
}