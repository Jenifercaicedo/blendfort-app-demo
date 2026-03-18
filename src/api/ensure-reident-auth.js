import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESIDENTE_PASSWORD = "Blendfort2026";

const normalize = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

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

const rolesPermitidos = new Set([
  "RESIDENTE",
  "INGENIERO",
  "INGENIERA",
  "ARQUITECTO",
  "ARQUITECTA",
  "ING",
  "ING.",
  "ARQ",
  "ARQ.",
]);

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { nombre } = req.body || {};
    const nombreLimpio = String(nombre || "").trim();

    if (!nombreLimpio) {
      return res.status(400).json({ error: "Nombre requerido" });
    }

    const nombreN = normalize(nombreLimpio);

    // 1) Validar en personal
    const { data: personalRows, error: personalError } = await admin
      .from("personal")
      .select("nombre, rol")
      .limit(1000);

    if (personalError) {
      throw personalError;
    }

    const emp = (personalRows || []).find(
      (p) => normalize(p?.nombre) === nombreN
    );

    if (!emp) {
      return res.status(403).json({ error: "No está registrado en gestión personal" });
    }

    const rol = normalize(emp?.rol);
    if (!rolesPermitidos.has(rol)) {
      return res.status(403).json({ error: "Rol sin acceso a residente" });
    }

    // 2) Validar proyecto asignado
    const { data: proyectosRows, error: proyectosError } = await admin
      .from("proyectos")
      .select("nombre, residente, residentes")
      .limit(1000);

    if (proyectosError) {
      throw proyectosError;
    }

    const asignados = (proyectosRows || []).filter((p) => {
      const r1 = normalize(p?.residente);
      const rList = Array.isArray(p?.residentes)
        ? p.residentes.map((r) => normalize(r))
        : [];
      return r1 === nombreN || rList.includes(nombreN);
    });

    if (!asignados.length) {
      return res.status(403).json({ error: "No tiene proyecto asignado" });
    }

    // 3) Asegurar usuario Auth
    const email = buildResidentEmail(nombreLimpio);

    const { data: listData, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      throw listError;
    }

    const yaExiste = (listData?.users || []).some(
      (u) => String(u.email || "").toLowerCase() === email.toLowerCase()
    );

    if (!yaExiste) {
      const { error: createError } = await admin.auth.admin.createUser({
        email,
        password: RESIDENTE_PASSWORD,
        email_confirm: true,
        user_metadata: {
          nombre: nombreLimpio,
          tipo: "residente",
        },
      });

      if (createError) {
        throw createError;
      }
    }

    return res.status(200).json({
      ok: true,
      email,
      nombre: nombreLimpio,
    });
  } catch (error) {
    console.error("ensure-resident-auth error:", error);
    return res.status(500).json({
      error: error?.message || "No se pudo asegurar el usuario residente",
    });
  }
}