import React, { useEffect, useMemo, useState } from "react";
import CustomSelect from "./CustomSelect";

const normalize = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const safeNum = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

const money = (n) =>
  `$ ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const initialForm = {
  id: "",
  codigo: "",
  nombre: "",
  tipoPersonal: "CAMPO",
  tipoPago: "DIARIO",
  valorDia: "",
  valorHoraExtra: "",
  salarioMensual: "",
  activo: true,
};

const estadoBadge = (activo) =>
  activo
    ? "bg-green-50 text-green-700 border-green-200"
    : "bg-slate-100 text-slate-600 border-slate-200";

const tipoBadge = (tipo) => {
  const t = normalize(tipo);

  if (t === "CAMPO") return "bg-amber-50 text-amber-700 border-amber-200";
  if (t === "OFICINA") return "bg-sky-50 text-sky-700 border-sky-200";
  if (t === "RESIDENTE") return "bg-violet-50 text-violet-700 border-violet-200";
  if (t === "ADMINISTRATIVO") return "bg-emerald-50 text-emerald-700 border-emerald-200";

  return "bg-slate-100 text-slate-600 border-slate-200";
};

const CatalogoCargosModal = ({
  show = false,
  onClose,
  cargos = [],
  loading = false,
  onCreateCargo = async () => {},
  onUpdateCargo = async () => {},
  onToggleCargoActivo = async () => {},
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cargoSeleccionadoId, setCargoSeleccionadoId] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (!show) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [show]);

  useEffect(() => {
    if (!show) return;

    setBusqueda("");
    setSoloActivos(true);
    setGuardando(false);
    setCargoSeleccionadoId("");
    setFormVisible(false);
    setForm(initialForm);
  }, [show]);

  const cargosFiltrados = useMemo(() => {
    let rows = [...(cargos || [])];

    if (soloActivos) {
      rows = rows.filter((c) => Boolean(c?.activo));
    }

    if (busqueda.trim()) {
      const q = normalize(busqueda);

      rows = rows.filter((c) => {
        const nombre = normalize(c?.nombre);
        const codigo = normalize(c?.codigo);
        const tipoPersonal = normalize(c?.tipo_personal || c?.tipoPersonal);
        const tipoPago = normalize(c?.tipo_pago || c?.tipoPago);

        return (
          nombre.includes(q) ||
          codigo.includes(q) ||
          tipoPersonal.includes(q) ||
          tipoPago.includes(q)
        );
      });
    }

    return rows.sort((a, b) =>
      normalize(a?.nombre).localeCompare(normalize(b?.nombre))
    );
  }, [cargos, busqueda, soloActivos]);

  const opcionesTipoPersonal = ["CAMPO", "OFICINA", "RESIDENTE", "ADMINISTRATIVO"];
  const opcionesTipoPago = ["DIARIO", "MENSUAL"];

  const seleccionarCargo = (cargo) => {
    setCargoSeleccionadoId(cargo?.id || "");
    setFormVisible(true);
    setForm({
      id: cargo?.id || "",
      codigo: normalize(cargo?.codigo),
      nombre: normalize(cargo?.nombre),
      tipoPersonal: normalize(cargo?.tipo_personal || cargo?.tipoPersonal || "CAMPO"),
      tipoPago: normalize(cargo?.tipo_pago || cargo?.tipoPago || "DIARIO"),
      valorDia: String(safeNum(cargo?.valor_dia ?? cargo?.valorDia)),
      valorHoraExtra: String(
        safeNum(cargo?.valor_hora_extra ?? cargo?.valorHoraExtra)
      ),
      salarioMensual: String(
        safeNum(cargo?.salario_mensual ?? cargo?.salarioMensual)
      ),
      activo: Boolean(cargo?.activo),
    });
  };

  const abrirNuevoCargo = () => {
    setCargoSeleccionadoId("");
    setForm(initialForm);
    setFormVisible(true);
  };

  const cerrarFormulario = () => {
    setCargoSeleccionadoId("");
    setForm(initialForm);
    setFormVisible(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const codigo = normalize(form.codigo);
    const nombre = normalize(form.nombre);
    const tipoPersonal = normalize(form.tipoPersonal || "CAMPO");
    const tipoPago = normalize(form.tipoPago || "DIARIO");

    if (!codigo || !nombre) return;

    const payload = {
      codigo,
      nombre,
      tipo_personal: tipoPersonal,
      tipo_pago: tipoPago,
      valor_dia: tipoPago === "DIARIO" ? safeNum(form.valorDia) : 0,
      valor_hora_extra: tipoPago === "DIARIO" ? safeNum(form.valorHoraExtra) : 0,
      salario_mensual: tipoPago === "MENSUAL" ? safeNum(form.salarioMensual) : 0,
      activo: Boolean(form.activo),
    };

    try {
      setGuardando(true);

      if (form.id) {
        await onUpdateCargo(form.id, payload);
      } else {
        await onCreateCargo(payload);
      }

      cerrarFormulario();
    } catch (error) {
      console.error("Error guardando cargo:", error);
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (cargo) => {
    try {
      await onToggleCargoActivo(cargo?.id, !cargo?.activo);

      if (String(form?.id) === String(cargo?.id)) {
        setForm((prev) => ({ ...prev, activo: !cargo?.activo }));
      }
    } catch (error) {
      console.error("Error cambiando estado del cargo:", error);
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[170] overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="min-h-full flex items-start md:items-center justify-center px-4 py-5 md:px-6 md:py-8">
        <div className="w-full max-w-7xl overflow-hidden rounded-[1.8rem] md:rounded-[2.3rem] border border-black/5 bg-[#F6F6F1] shadow-[0_30px_80px_rgba(15,23,42,0.18)] my-2 max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="sticky top-0 z-20 border-b border-black/5 bg-white/95 backdrop-blur px-4 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-[2px] bg-[#FCB017]" />
                  <span className="text-[8px] font-black uppercase tracking-[0.22em] text-[#C98500]">
                    Gestión de personal
                  </span>
                </div>

                <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight leading-tight text-slate-800">
                  Catálogo de cargos
                </h2>

                <p className="mt-2 text-[11px] md:text-[12px] font-medium text-slate-500">
                  Administra cargos y tarifas unificadas para toda la app.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-black text-white hover:bg-[#FCB017] transition-all active:scale-95 flex items-center justify-center"
                aria-label="Cerrar"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-4 p-4 md:p-6">
            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-black/5 bg-white p-4 shadow-sm">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="ml-3 text-[8px] font-black uppercase tracking-widest text-slate-400">
                      Buscar cargo
                    </label>
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="NOMBRE, CÓDIGO, TIPO..."
                      className="w-full h-[48px] rounded-2xl border border-black/5 bg-[#F9F9F6] px-4 text-[11px] font-black uppercase outline-none transition-all focus:border-black/15 focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[#F9F9F6] px-4 py-3">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-700">
                        Mostrar solo activos
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSoloActivos((v) => !v)}
                      className={`relative h-7 w-14 rounded-full transition-all ${
                        soloActivos ? "bg-[#FCB017]" : "bg-slate-200"
                      }`}
                    >
                      <div
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all ${
                          soloActivos ? "left-8" : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={abrirNuevoCargo}
                    className="w-full h-11 rounded-2xl bg-black text-white font-black text-[9px] uppercase tracking-[0.18em] hover:bg-[#FCB017] transition-all active:scale-95"
                  >
                    Nuevo cargo
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-black/5 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-black/5 px-4 py-3 bg-[#F9F9F6]">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Cargos registrados
                  </p>
                </div>

                <div className="max-h-[520px] overflow-y-auto p-3 space-y-3">
                  {loading ? (
                    <div className="rounded-[1.3rem] border border-dashed border-black/10 p-8 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        Cargando cargos...
                      </p>
                    </div>
                  ) : cargosFiltrados.length === 0 ? (
                    <div className="rounded-[1.3rem] border border-dashed border-black/10 p-8 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        No hay cargos para mostrar
                      </p>
                    </div>
                  ) : (
                    cargosFiltrados.map((cargo) => {
                      const activo = Boolean(cargo?.activo);
                      const seleccionado =
                        String(cargoSeleccionadoId) === String(cargo?.id);

                      return (
                        <div
                          key={cargo?.id || cargo?.codigo}
                          className={`rounded-[1.3rem] border p-4 shadow-sm transition-all ${
                            seleccionado
                              ? "border-[#FCB017]/40 bg-[#FFF8E8]"
                              : "border-black/5 bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => seleccionarCargo(cargo)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <p className="text-[13px] font-black uppercase tracking-tight text-slate-800">
                                {cargo?.nombre || "SIN NOMBRE"}
                              </p>
                              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                {cargo?.codigo || "SIN CÓDIGO"}
                              </p>
                            </button>

                            <span
                              className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${estadoBadge(
                                activo
                              )}`}
                            >
                              {activo ? "Activo" : "Inactivo"}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${tipoBadge(
                                cargo?.tipo_personal || cargo?.tipoPersonal
                              )}`}
                            >
                              {normalize(cargo?.tipo_personal || cargo?.tipoPersonal)}
                            </span>

                            <span className="inline-flex rounded-full border border-black/10 bg-slate-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-slate-600">
                              {normalize(cargo?.tipo_pago || cargo?.tipoPago)}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                            <div className="rounded-xl bg-[#F9F9F6] px-3 py-2">
                              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                Día
                              </p>
                              <p className="mt-1 font-black text-slate-800">
                                {money(cargo?.valor_dia ?? cargo?.valorDia)}
                              </p>
                            </div>

                            <div className="rounded-xl bg-[#F9F9F6] px-3 py-2">
                              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                H. Extra
                              </p>
                              <p className="mt-1 font-black text-slate-800">
                                {money(cargo?.valor_hora_extra ?? cargo?.valorHoraExtra)}
                              </p>
                            </div>

                            <div className="rounded-xl bg-[#F9F9F6] px-3 py-2">
                              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                Mensual
                              </p>
                              <p className="mt-1 font-black text-slate-800">
                                {money(cargo?.salario_mensual ?? cargo?.salarioMensual)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => seleccionarCargo(cargo)}
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-[9px] font-black uppercase tracking-[0.14em] text-slate-700 hover:border-[#FCB017] hover:text-[#C98500] transition-all"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActivo(cargo)}
                              className={`inline-flex h-9 items-center justify-center rounded-xl px-4 text-[9px] font-black uppercase tracking-[0.14em] transition-all ${
                                activo
                                  ? "bg-red-50 text-red-700 hover:bg-red-100"
                                  : "bg-green-50 text-green-700 hover:bg-green-100"
                              }`}
                            >
                              {activo ? "Inactivar" : "Activar"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {formVisible ? (
                <div className="rounded-[1.5rem] border border-black/5 bg-white p-4 md:p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-[2px] bg-[#FCB017]" />
                        <span className="text-[8px] font-black uppercase tracking-[0.18em] text-[#C98500]">
                          {form.id ? "Edición" : "Nuevo registro"}
                        </span>
                      </div>

                      <h3 className="mt-2 text-[22px] md:text-[26px] font-black tracking-tight text-slate-800">
                        {form.id ? "Editar cargo" : "Crear cargo"}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={cerrarFormulario}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-all"
                    >
                      Cerrar
                    </button>
                  </div>

                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="ml-3 text-[8px] font-black uppercase tracking-widest text-slate-400">
                          Código
                        </label>
                        <input
                          required
                          type="text"
                          value={form.codigo}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              codigo: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="MAESTRO"
                          className="w-full h-[50px] rounded-2xl border border-black/5 bg-[#F9F9F6] px-4 text-[11px] font-black uppercase outline-none transition-all focus:border-black/15 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="ml-3 text-[8px] font-black uppercase tracking-widest text-slate-400">
                          Nombre
                        </label>
                        <input
                          required
                          type="text"
                          value={form.nombre}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              nombre: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="MAESTRO"
                          className="w-full h-[50px] rounded-2xl border border-black/5 bg-[#F9F9F6] px-4 text-[11px] font-black uppercase outline-none transition-all focus:border-black/15 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <CustomSelect
                        label="Tipo de personal"
                        options={opcionesTipoPersonal}
                        value={form.tipoPersonal}
                        onChange={(val) =>
                          setForm((prev) => ({
                            ...prev,
                            tipoPersonal: normalize(val),
                          }))
                        }
                        placeholder="SELECCIONAR..."
                        allowCustom={false}
                      />

                      <CustomSelect
                        label="Tipo de pago"
                        options={opcionesTipoPago}
                        value={form.tipoPago}
                        onChange={(val) =>
                          setForm((prev) => ({
                            ...prev,
                            tipoPago: normalize(val),
                            valorDia: normalize(val) === "MENSUAL" ? "" : prev.valorDia,
                            valorHoraExtra:
                              normalize(val) === "MENSUAL" ? "" : prev.valorHoraExtra,
                            salarioMensual:
                              normalize(val) === "DIARIO" ? "" : prev.salarioMensual,
                          }))
                        }
                        placeholder="SELECCIONAR..."
                        allowCustom={false}
                      />
                    </div>

                    {form.tipoPago === "DIARIO" ? (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="ml-3 text-[8px] font-black uppercase tracking-widest text-slate-400">
                            Valor día
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.valorDia}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                valorDia: e.target.value,
                              }))
                            }
                            placeholder="0.00"
                            className="w-full h-[50px] rounded-2xl border border-black/5 bg-[#F9F9F6] px-4 text-[11px] font-black outline-none transition-all focus:border-black/15 focus:bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="ml-3 text-[8px] font-black uppercase tracking-widest text-slate-400">
                            Valor hora extra
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.valorHoraExtra}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                valorHoraExtra: e.target.value,
                              }))
                            }
                            placeholder="0.00"
                            className="w-full h-[50px] rounded-2xl border border-black/5 bg-[#F9F9F6] px-4 text-[11px] font-black outline-none transition-all focus:border-black/15 focus:bg-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                          <label className="ml-3 text-[8px] font-black uppercase tracking-widest text-slate-400">
                            Salario mensual
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.salarioMensual}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                salarioMensual: e.target.value,
                              }))
                            }
                            placeholder="0.00"
                            className="w-full h-[50px] rounded-2xl border border-black/5 bg-[#F9F9F6] px-4 text-[11px] font-black outline-none transition-all focus:border-black/15 focus:bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <div className="rounded-[1.4rem] border border-black/5 bg-[#F9F9F6] px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Vista previa
                      </p>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-xl bg-white px-4 py-3 border border-black/5">
                          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Día
                          </p>
                          <p className="mt-1 text-[13px] font-black text-slate-800">
                            {money(form.valorDia)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white px-4 py-3 border border-black/5">
                          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                            H. Extra
                          </p>
                          <p className="mt-1 text-[13px] font-black text-slate-800">
                            {money(form.valorHoraExtra)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white px-4 py-3 border border-black/5">
                          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Mensual
                          </p>
                          <p className="mt-1 text-[13px] font-black text-slate-800">
                            {money(form.salarioMensual)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={cerrarFormulario}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-[12px] font-semibold text-slate-600 transition-all hover:border-slate-300 hover:text-slate-800"
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        disabled={guardando}
                        className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-[12px] font-semibold transition-all ${
                          guardando
                            ? "bg-black/10 text-black/30 cursor-not-allowed"
                            : "bg-slate-800 text-white hover:bg-[#FCB017]"
                        }`}
                      >
                        <span>
                          {guardando
                            ? "Guardando..."
                            : form.id
                            ? "Guardar cambios"
                            : "Crear cargo"}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white p-8 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Selecciona un cargo o pulsa “Nuevo cargo”
                  </p>
                </div>
              )}

              <div className="rounded-[1.5rem] border border-black/5 bg-white p-4 shadow-sm">
                <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.16em] text-black/25">
                  Los cargos del catálogo se usarán para autocompletar tarifas al crear personal y dejar una estructura reutilizable en admin y resident.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogoCargosModal;