import { createClient } from "@supabase/supabase-js";

const norm = (s) =>
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: "Faltan variables de entorno de Supabase en el servidor",
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const nombre = norm(req.body?.nombre);

    if (!nombre) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    // 1) Validar que exista como empleado RESIDENTE
    const { data: empleado, error: empleadoError } = await admin
      .from("empleados")
      .select("id,nombre,rol,estado_general")
      .eq("nombre", nombre)
      .eq("rol", "RESIDENTE")
      .eq("estado_general", "ACTIVO")
      .maybeSingle();

    if (empleadoError) throw empleadoError;

    if (!empleado?.id) {
      return res.status(403).json({
        error: "No está registrado como residente activo",
      });
    }

    // 2) Validar que tenga al menos una asignación activa
    const { data: asignaciones, error: asignacionesError } = await admin
      .from("empleado_proyecto")
      .select("id,proyecto_id,estado_asignacion")
      .eq("empleado_id", empleado.id)
      .eq("estado_asignacion", "ACTIVO")
      .limit(1);

    if (asignacionesError) throw asignacionesError;

    if (!asignaciones || asignaciones.length === 0) {
      return res.status(403).json({
        error: "No tiene proyectos activos asignados",
      });
    }

    // 3) Email derivado del nombre
    const email = buildResidentEmail(nombre);
    const password = "Blendfort2026";

    // 4) Buscar si ya existe el usuario Auth
    const { data: usersData, error: listUsersError } =
      await admin.auth.admin.listUsers();

    if (listUsersError) throw listUsersError;

    const existingUser = (usersData?.users || []).find(
      (u) => String(u.email || "").toLowerCase() === email.toLowerCase()
    );

    let userId = existingUser?.id || null;

    // 5) Si no existe, crearlo
    if (!userId) {
      const { data: createdUserData, error: createUserError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            nombre,
            rol: "RESIDENTE",
          },
        });

      if (createUserError) throw createUserError;
      userId = createdUserData?.user?.id || null;
    }

    if (!userId) {
      return res.status(500).json({
        error: "No se pudo asegurar el usuario del residente",
      });
    }

    return res.status(200).json({
      ok: true,
      email,
      userId,
      nombre,
    });
  } catch (error) {
    console.error("ensure-resident-auth error:", error);
    return res.status(500).json({
      error: error?.message || "Error interno preparando acceso del residente",
    });
  }
}