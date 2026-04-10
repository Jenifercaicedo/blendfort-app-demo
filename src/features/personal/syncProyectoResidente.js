import { supabase } from "../../lib/supabase";

const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export const asegurarAsignacionResidentePrincipalDB = async ({
  proyectoId,
  proyectoNombre,
  residenteNombre,
}) => {
  const residente = norm(residenteNombre);
  if (!proyectoId || !residente) return { synced: false, reason: "missing_data" };

  // 1) Buscar empleado residente activo
  const { data: empleado, error: empleadoError } = await supabase
    .from("empleados")
    .select("id,nombre,rol,estado_general")
    .eq("nombre", residente)
    .eq("rol", "RESIDENTE")
    .eq("estado_general", "ACTIVO")
    .maybeSingle();

  if (empleadoError) throw empleadoError;

  // Si no existe como empleado residente, no rompemos el flujo del proyecto
  if (!empleado?.id) {
    return { synced: false, reason: "empleado_residente_no_existe" };
  }

  // 2) Upsert de asignación activa
  const { error: asignacionError } = await supabase
    .from("empleado_proyecto")
    .upsert(
      [
        {
          empleado_id: empleado.id,
          proyecto_id: proyectoId,
          cargo_en_proyecto: "RESIDENTE",
          rol_en_proyecto: "RESIDENTE",
          tipo_en_proyecto: "OFICINA",
          estado_asignacion: "ACTIVO",
        },
      ],
      { onConflict: "empleado_id,proyecto_id" }
    );

  if (asignacionError) throw asignacionError;

  return {
    synced: true,
    proyectoId,
    proyectoNombre: norm(proyectoNombre),
    residente,
    empleadoId: empleado.id,
  };
};