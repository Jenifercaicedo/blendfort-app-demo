import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "admin@blendfortdemo.com";

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

function getBearerToken(req) {
  const authHeader =
    req.headers.authorization || req.headers.Authorization || "";

  if (!authHeader.startsWith("Bearer ")) return "";

  return authHeader.replace("Bearer ", "").trim();
}

function parseJwtPayload(token) {
  try {
    const payloadPart = String(token || "").split(".")[1] || "";
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function getProjectBaseUrlFromIss(iss) {
  return String(iss || "").replace(/\/auth\/v1\/?$/, "");
}

async function validarAdmin(req, supabaseAdmin, serverSupabaseUrl) {
  const token = getBearerToken(req);

  if (!token) {
    throw new Error("NO AUTORIZADO");
  }

  const payload = parseJwtPayload(token);
  const tokenIss = String(payload?.iss || "").trim();
  const tokenBaseUrl = getProjectBaseUrlFromIss(tokenIss);

  console.log("[admin-cliente-access] SERVER SUPABASE URL:", serverSupabaseUrl);
  console.log("[admin-cliente-access] TOKEN ISS:", tokenIss);
  console.log("[admin-cliente-access] TOKEN BASE URL:", tokenBaseUrl);

  if (tokenBaseUrl && serverSupabaseUrl && tokenBaseUrl !== serverSupabaseUrl) {
    throw new Error(
      `TOKEN DE OTRO PROYECTO SUPABASE. TOKEN=${tokenBaseUrl} SERVER=${serverSupabaseUrl}`
    );
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    console.error("[admin-cliente-access] auth.getUser error:", error);
    throw new Error("SESIÓN INVÁLIDA");
  }

  const user = data.user;
  const email = String(user.email || "").toLowerCase().trim();

  if (email === ADMIN_EMAIL.toLowerCase()) {
    return user;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  if (!profileError && normalize(profile?.rol) === "ADMIN") {
    return user;
  }

  throw new Error("SOLO EL ADMINISTRADOR PUEDE GESTIONAR ESTE ACCESO");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "MÉTODO NO PERMITIDO" });
  }

  try {
    const serverSupabaseUrl = getSupabaseUrl();
    const supabaseAdmin = getSupabaseAdmin();

    await validarAdmin(req, supabaseAdmin, serverSupabaseUrl);

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    const action = String(body?.action || "").trim().toLowerCase();
    const proyectoId = String(body?.proyectoId || "").trim();

    if (!action) {
      return res.status(400).json({ error: "ACCIÓN REQUERIDA" });
    }

    if (!proyectoId) {
      return res.status(400).json({ error: "PROYECTO REQUERIDO" });
    }

    if (action === "get") {
      const { data, error } = await supabaseAdmin
        .from("cliente_accesos")
        .select("*")
        .eq("proyecto_id", proyectoId)
        .maybeSingle();

      if (error) throw error;

      return res.status(200).json({ acceso: data || null });
    }

    if (action === "save") {
      const nombreCliente = normalize(body?.nombreCliente);
      const codigoAcceso = normalize(body?.codigoAcceso);
      const activo = Boolean(body?.activo);

      if (!nombreCliente) {
        return res.status(400).json({ error: "NOMBRE CLIENTE REQUERIDO" });
      }

      if (!codigoAcceso) {
        return res.status(400).json({ error: "CÓDIGO DE ACCESO REQUERIDO" });
      }

      const { data: existente, error: existenteError } = await supabaseAdmin
        .from("cliente_accesos")
        .select("*")
        .eq("proyecto_id", proyectoId)
        .maybeSingle();

      if (existenteError) throw existenteError;

      if (existente?.id) {
        const { data, error } = await supabaseAdmin
          .from("cliente_accesos")
          .update({
            nombre_cliente: nombreCliente,
            codigo_acceso: codigoAcceso,
            activo,
          })
          .eq("id", existente.id)
          .select()
          .single();

        if (error) throw error;

        return res.status(200).json({
          acceso: data,
          message: "PORTAL CLIENTE ACTUALIZADO",
        });
      }

      const { data, error } = await supabaseAdmin
        .from("cliente_accesos")
        .insert([
          {
            proyecto_id: proyectoId,
            nombre_cliente: nombreCliente,
            codigo_acceso: codigoAcceso,
            activo,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        acceso: data,
        message: "PORTAL CLIENTE GUARDADO",
      });
    }

    return res.status(400).json({ error: "ACCIÓN NO VÁLIDA" });
  } catch (error) {
    console.error("[admin-cliente-access] error:", error);

    const msg =
      error?.message ||
      error?.details ||
      error?.hint ||
      "NO SE PUDO GESTIONAR EL PORTAL CLIENTE";

    if (
      String(msg).includes("duplicate key") ||
      String(msg).includes("duplicate") ||
      String(msg).includes("23505")
    ) {
      return res.status(400).json({
        error: "EL CÓDIGO YA EXISTE. GENERA UNO DISTINTO",
      });
    }

    if (
      msg === "NO AUTORIZADO" ||
      msg === "SESIÓN INVÁLIDA" ||
      msg === "SOLO EL ADMINISTRADOR PUEDE GESTIONAR ESTE ACCESO" ||
      String(msg).startsWith("TOKEN DE OTRO PROYECTO SUPABASE")
    ) {
      return res.status(403).json({ error: msg });
    }

    return res.status(500).json({ error: msg });
  }
}