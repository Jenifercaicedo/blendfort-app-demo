import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const normalize = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const slugCode = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const generarCodigoCliente = (nombreProyecto = "") => {
  const base = slugCode(nombreProyecto)
    .split("-")
    .filter(Boolean)
    .slice(0, 2)
    .join("-")
    .slice(0, 10);

  const random = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `BLEND-${base || "PROY"}-${random}`;
};

const apiAdminCliente = async (payload) => {
  let {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed?.data?.session || null;
  }

  const token = session?.access_token;

  if (!token) {
    throw new Error("NO HAY SESIÓN ADMINISTRATIVA ACTIVA");
  }

  const res = await fetch("/api/admin-cliente-access", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  let json = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  if (!res.ok) {
    throw new Error(json?.error || "NO SE PUDO GESTIONAR EL PORTAL CLIENTE");
  }

  return json;
};

const ModalAccesoCliente = ({ show, onClose, proyecto }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [form, setForm] = useState({
    nombreCliente: "",
    codigoAcceso: "",
    activo: true,
  });

  const proyectoNombre = useMemo(
    () => String(proyecto?.nombre || "").toUpperCase(),
    [proyecto?.nombre]
  );

  useEffect(() => {
    if (!show || !proyecto?.id) return;

    let mounted = true;

    const cargarAcceso = async () => {
      setLoading(true);
      setMensaje("");
      setCopiado(false);

      try {
        const json = await apiAdminCliente({
          action: "get",
          proyectoId: proyecto.id,
        });

        const acceso = json?.acceso || null;

        if (!mounted) return;

        if (acceso?.id) {
          setForm({
            nombreCliente: acceso?.nombre_cliente || "",
            codigoAcceso:
              acceso?.codigo_acceso || generarCodigoCliente(proyecto?.nombre),
            activo: Boolean(acceso?.activo),
          });
        } else {
          setForm({
            nombreCliente: "",
            codigoAcceso: generarCodigoCliente(proyecto?.nombre),
            activo: true,
          });
        }
      } catch (error) {
        if (!mounted) return;
        setMensaje(error?.message || "NO SE PUDO CARGAR EL ACCESO CLIENTE");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    cargarAcceso();

    return () => {
      mounted = false;
    };
  }, [show, proyecto?.id, proyecto?.nombre]);

  if (!show) return null;

  const guardar = async (e) => {
    e.preventDefault();

    if (!proyecto?.id) return;

    try {
      setSaving(true);
      setMensaje("");

      const json = await apiAdminCliente({
        action: "save",
        proyectoId: proyecto.id,
        nombreCliente: form.nombreCliente,
        codigoAcceso: form.codigoAcceso,
        activo: form.activo,
      });

      setMensaje(json?.message || "PORTAL CLIENTE GUARDADO");
    } catch (error) {
      setMensaje(error?.message || "NO SE PUDO GUARDAR EL PORTAL CLIENTE");
    } finally {
      setSaving(false);
    }
  };

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(form.codigoAcceso);
      setCopiado(true);
      setMensaje("CÓDIGO COPIADO");
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      setMensaje("NO SE PUDO COPIAR EL CÓDIGO");
    }
  };

  const regenerarCodigo = () => {
    setForm((prev) => ({
      ...prev,
      codigoAcceso: generarCodigoCliente(proyecto?.nombre),
    }));
    setCopiado(false);
    setMensaje("");
  };

  return (
    <div
      className="fixed inset-0 z-[170] overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-8 md:px-6 md:py-10">
        <div className="bg-white w-full max-w-2xl rounded-[2rem] md:rounded-[3.2rem] overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)] border border-black/5 max-h-[calc(100vh-4rem)] overflow-y-auto animate-in zoom-in-95 duration-300">
          <div className="relative pt-8 md:pt-10 px-6 md:px-10 pb-5 md:pb-6 border-b border-black/5">
            <div className="space-y-2 pr-12">
              <div className="flex items-center gap-2">
                <div className="w-6 md:w-8 h-[2px] bg-blendfort-naranja"></div>
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.32em] text-black/35">
                  Portal Cliente
                </span>
              </div>

              <h2 className="text-[1.6rem] md:text-4xl font-black uppercase tracking-tight text-black leading-none">
                Acceso Cliente
              </h2>

              <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.16em] text-black/35">
                {proyectoNombre || "SIN PROYECTO"}
              </p>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="absolute top-5 right-5 md:top-7 md:right-7 bg-black text-white p-2.5 md:p-3 rounded-full hover:bg-blendfort-naranja transition-all shadow-lg active:scale-90"
              aria-label="Cerrar"
            >
              <i className="pi pi-times text-[14px] md:text-[15px]" />
            </button>
          </div>

          <form onSubmit={guardar} className="p-6 md:p-10 space-y-5 md:space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-[1.5rem] border border-black/5 bg-blendfort-fondo/40 px-4 py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/35">
                      Estado del portal
                    </p>
                    <p className="mt-2 text-[13px] font-black uppercase tracking-[0.08em] text-black">
                      {form.activo ? "ACTIVO" : "INACTIVO"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, activo: !prev.activo }))
                    }
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[11px] font-black uppercase tracking-[0.12em] transition ${
                      form.activo
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <i
                      className={`pi ${
                        form.activo ? "pi-check-circle" : "pi-times-circle"
                      } text-[12px]`}
                    />
                    {form.activo ? "Activo" : "Inactivo"}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                  Nombre del Cliente
                </label>
                <input
                  required
                  placeholder="NOMBRE DEL CLIENTE"
                  className="w-full bg-blendfort-fondo px-4 py-3.5 rounded-[1.1rem] md:rounded-2xl text-[15px] md:text-[11px] font-black uppercase outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                  value={form.nombreCliente}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      nombreCliente: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase ml-3 md:ml-4 opacity-30 tracking-widest">
                  Código de Acceso
                </label>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
                  <input
                    required
                    placeholder="CÓDIGO"
                    className="w-full bg-blendfort-fondo px-4 py-3.5 rounded-[1.1rem] md:rounded-2xl text-[15px] md:text-[11px] font-black uppercase outline-none border border-transparent focus:bg-white focus:border-black/5 transition-all"
                    value={form.codigoAcceso}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        codigoAcceso: e.target.value.toUpperCase(),
                      }))
                    }
                  />

                  <button
                    type="button"
                    onClick={regenerarCodigo}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-black/10 bg-white text-[11px] font-black uppercase tracking-[0.12em] text-slate-700 hover:border-blendfort-naranja hover:text-[#C98500] transition-all"
                  >
                    <i className="pi pi-refresh text-[12px]" />
                    Regenerar
                  </button>

                  <button
                    type="button"
                    onClick={copiarCodigo}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-black/10 bg-white text-[11px] font-black uppercase tracking-[0.12em] text-slate-700 hover:border-blendfort-naranja hover:text-[#C98500] transition-all"
                  >
                    <i className="pi pi-copy text-[12px]" />
                    {copiado ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-black/45">
                    CARGANDO CONFIGURACIÓN DEL PORTAL...
                  </p>
                </div>
              ) : null}

              {mensaje ? (
                <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-black/55">
                    {mensaje}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || loading}
                className="w-full py-4.5 rounded-full font-black text-[14px] md:text-[11px] uppercase tracking-[0.18em] md:tracking-[0.4em] transition-all flex items-center justify-center gap-3 bg-black text-white hover:bg-blendfort-naranja active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? "Guardando" : "Guardar Portal"}
                <i className="pi pi-arrow-right text-[12px] opacity-70" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full text-[10px] font-black uppercase opacity-40 hover:opacity-100 py-2 text-center tracking-widest"
            >
              ← Cerrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalAccesoCliente;