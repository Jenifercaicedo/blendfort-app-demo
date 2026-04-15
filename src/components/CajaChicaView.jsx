import React, { useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext";
import CustomSelect from "./CustomSelect";
import ModalCajaChica from "./ModalCajaChica";

const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const hoyISO = () => new Date().toISOString().slice(0, 10);

const money = (n) =>
  `$ ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const estadoTone = (estado) => {
  const e = norm(estado);
  if (e === "DISPONIBLE") return "bg-green-50 text-green-700 border-green-200";
  if (e === "POR AGOTARSE") return "bg-amber-50 text-amber-700 border-amber-200";
  if (e === "AGOTADA") return "bg-red-50 text-red-700 border-red-200";
  if (e === "EXCEDIDA") return "bg-red-100 text-red-800 border-red-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
};

const estadoHistorialTone = (estado) => {
  const e = norm(estado);
  if (e === "DISPONIBLE") return "bg-green-50 text-green-700 border-green-200";
  if (e === "POR AGOTARSE") return "bg-amber-50 text-amber-700 border-amber-200";
  if (e === "AGOTADA") return "bg-red-50 text-red-700 border-red-200";
  if (e === "EXCEDIDA") return "bg-red-100 text-red-800 border-red-200";
  if (e === "NO VIGENTE") return "bg-slate-100 text-slate-500 border-slate-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
};

const KpiCard = ({ label, value, tone = "text-slate-800", accent = false, icon }) => (
  <div
    className={`rounded-[1.4rem] border p-4 md:p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${
      accent ? "border-[#FCB017]/20 bg-[#FFF8E8]" : "border-black/5 bg-white"
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <h3 className={`mt-2 text-[20px] md:text-[26px] font-black tracking-tight ${tone}`}>
          {value}
        </h3>
      </div>

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
          accent
            ? "border-[#FCB017]/20 bg-white text-[#C98500]"
            : "border-black/5 bg-slate-50 text-slate-600"
        }`}
      >
        <i className={`${icon} text-[14px]`} />
      </div>
    </div>
  </div>
);

const CajaChicaView = ({ onBack }) => {
  const {
    cajaChicaDesembolsos,
    movimientosCajaChica,
    getResumenesCajaChicaResidente,
    registrarDesembolsoCajaChicaResidente,
  } = useAppContext();

  const [showModal, setShowModal] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const [showResumen, setShowResumen] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);

  const [data, setData] = useState({
    residente: "",
    fechaDesembolso: hoyISO(),
    monto: "",
    observacion: "",
  });

  const [filtroResidente, setFiltroResidente] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");

  const resumenes = useMemo(() => {
    return getResumenesCajaChicaResidente();
  }, [getResumenesCajaChicaResidente, cajaChicaDesembolsos, movimientosCajaChica]);

  const opcionesResidentes = useMemo(() => {
    return [...new Set((resumenes || []).map((r) => norm(r.residente)).filter(Boolean))].sort();
  }, [resumenes]);

  const opcionesEstado = useMemo(() => {
    return [...new Set((resumenes || []).map((r) => norm(r.estado)).filter(Boolean))].sort();
  }, [resumenes]);

  const resumenesFiltrados = useMemo(() => {
    return (resumenes || []).filter((r) => {
      const okResidente =
        !filtroResidente || norm(r.residente) === norm(filtroResidente);

      const okEstado =
        !filtroEstado || norm(r.estado) === norm(filtroEstado);

      const okFecha =
        !filtroFecha ||
        String(r.fechaUltimoDesembolso || "").slice(0, 10) ===
          String(filtroFecha || "").slice(0, 10);

      return okResidente && okEstado && okFecha;
    });
  }, [resumenes, filtroResidente, filtroEstado, filtroFecha]);

  const stats = useMemo(() => {
    const activos = (resumenes || []).filter(
      (r) => Number(r.montoActualAsignado || 0) > 0
    ).length;

    const totalDesembolsado = (cajaChicaDesembolsos || []).reduce(
      (acc, d) => acc + Number(d.montoDesembolsado || d.monto_desembolsado || 0),
      0
    );

    const totalGastado = (resumenes || []).reduce(
      (acc, r) => acc + Number(r.gastadoActual || 0),
      0
    );

    const totalSaldo = (resumenes || []).reduce(
      (acc, r) => acc + Number(r.saldoActual || 0),
      0
    );

    const alertas = (resumenes || []).filter((r) => {
      const e = norm(r.estado);
      return e === "POR AGOTARSE" || e === "AGOTADA" || e === "EXCEDIDA";
    }).length;

    return {
      activos,
      totalDesembolsado,
      totalGastado,
      totalSaldo,
      alertas,
    };
  }, [resumenes, cajaChicaDesembolsos]);

  const historialFiltrado = useMemo(() => {
    return (cajaChicaDesembolsos || []).filter((d) => {
      const okResidente =
        !filtroResidente || norm(d.residente) === norm(filtroResidente);

      const okFecha =
        !filtroFecha ||
        String(d.fechaDesembolso || d.fecha_desembolso || "").slice(0, 10) ===
          String(filtroFecha || "").slice(0, 10);

      return okResidente && okFecha;
    });
  }, [cajaChicaDesembolsos, filtroResidente, filtroFecha]);

  const hayFiltros = useMemo(
    () => Boolean(filtroResidente || filtroEstado || filtroFecha),
    [filtroResidente, filtroEstado, filtroFecha]
  );

  const latestDesembolsoPorResidente = useMemo(() => {
    const map = new Map();

    for (const item of cajaChicaDesembolsos || []) {
      const key = norm(item?.residente);
      if (!key) continue;

      const current = map.get(key);

      if (!current) {
        map.set(key, item);
        continue;
      }

      const fechaItem = String(item?.fechaDesembolso || item?.fecha_desembolso || "");
      const fechaCurrent = String(current?.fechaDesembolso || current?.fecha_desembolso || "");

      if (fechaItem > fechaCurrent) {
        map.set(key, item);
        continue;
      }

      if (fechaItem === fechaCurrent) {
        const createdItem = String(item?.created_at || "");
        const createdCurrent = String(current?.created_at || "");

        if (createdItem > createdCurrent) {
          map.set(key, item);
        }
      }
    }

    return map;
  }, [cajaChicaDesembolsos]);

  const getEstadoHistorialVisual = (item) => {
    const residenteKey = norm(item?.residente);
    const latest = latestDesembolsoPorResidente.get(residenteKey);

    const esVigente = latest && String(latest.id) === String(item.id);

    if (!esVigente) {
      return {
        label: "NO VIGENTE",
        tone: estadoHistorialTone("NO VIGENTE"),
      };
    }

    const estadoActual = norm(item?.estadoNuevo || item?.estado_nuevo || "SIN FONDO");

    return {
      label: estadoActual,
      tone: estadoHistorialTone(estadoActual),
    };
  };

  const limpiarFiltros = () => {
    setFiltroResidente("");
    setFiltroEstado("");
    setFiltroFecha("");
  };

  const cerrarModal = () => {
    setShowModal(false);
    setMensajeExito(false);
    setData({
      residente: "",
      fechaDesembolso: hoyISO(),
      monto: "",
      observacion: "",
    });
  };

  const guardarDesembolso = async (e) => {
    e.preventDefault();

    try {
      if (!norm(data.residente)) return;
      if (!Number(data.monto || 0)) return;

      await registrarDesembolsoCajaChicaResidente(data);
      setMensajeExito(true);

      setTimeout(() => {
        cerrarModal();
      }, 900);
    } catch (error) {
      console.error("Error registrando desembolso:", error);
      alert("No se pudo registrar el desembolso.");
    }
  };

  const filtrosUI = (
    <div className="rounded-[1.6rem] border border-black/5 bg-white p-4 md:p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-4">
          <CustomSelect
            label="Residente"
            options={opcionesResidentes}
            value={filtroResidente}
            onChange={setFiltroResidente}
            placeholder="TODOS..."
            allowCustom={false}
          />
        </div>

        <div className="md:col-span-3">
          <CustomSelect
            label="Estado"
            options={opcionesEstado}
            value={filtroEstado}
            onChange={setFiltroEstado}
            placeholder="TODOS..."
            allowCustom={false}
          />
        </div>

        <div className="md:col-span-4 space-y-1">
          <label className="text-[8px] font-black uppercase ml-4 opacity-40 tracking-widest">
            Fecha
          </label>
          <input
            type="date"
            className="w-full bg-white border border-black/5 p-4 rounded-xl text-[10px] font-black outline-none h-[50px] focus:border-black transition-all shadow-sm"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
          />
        </div>

        {hayFiltros && (
          <div className="md:col-span-1 flex items-end">
            <button
              onClick={limpiarFiltros}
              type="button"
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-black/10 text-slate-600 transition-all active:scale-95 hover:border-[#FCB017] hover:text-[#C98500] shadow-sm h-[50px]"
            >
              <i className="pi pi-filter-slash text-[12px]" />
              <span className="hidden lg:inline text-[12px] font-semibold">
                Limpiar
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FCB017]/20 bg-[#FFF8E8] px-3 py-1.5 text-[11px] font-semibold text-[#C98500]">
            <i className="pi pi-credit-card text-[11px]" />
            <span>Caja chica</span>
          </div>

          <h2 className="mt-3 text-[28px] md:text-[34px] xl:text-[38px] font-black tracking-tight text-slate-800 leading-none">
            Caja chica
          </h2>

          <p className="mt-3 text-[13px] font-medium text-slate-500">
            Fondos, reposiciones e historial.
          </p>
        </div>

        <div className="flex justify-end items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => setShowFiltros((v) => !v)}
            className={`md:hidden relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition-all active:scale-95 ${
              showFiltros
                ? "border-[#FCB017] bg-[#FFF8E8] text-[#C98500]"
                : hayFiltros
                ? "border-[#FCB017]/30 bg-[#FFF8E8] text-[#C98500]"
                : "border-black/10 bg-white text-slate-600"
            }`}
            aria-label="Filtros"
            title="Filtros"
          >
            <i className="pi pi-filter text-[13px]" />
            {hayFiltros && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#FCB017]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowResumen((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[12px] font-semibold transition-all active:scale-95 ${
              showResumen
                ? "border-slate-800 bg-slate-800 text-white"
                : "border-black/10 bg-white text-slate-700 hover:border-[#FCB017] hover:text-[#C98500]"
            }`}
          >
            <i className="pi pi-chart-bar text-[12px]" />
            <span>Resumen</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setData({
                residente: "",
                fechaDesembolso: hoyISO(),
                monto: "",
                observacion: "",
              });
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#FCB017] active:scale-95 shadow-sm"
            aria-label="Nuevo desembolso"
            title="Nuevo desembolso"
          >
            <i className="pi pi-plus text-[12px]" />
            <span>Desembolso</span>
          </button>
        </div>
      </div>

      <div className="hidden md:block">{filtrosUI}</div>

      {showFiltros && (
        <div className="md:hidden animate-in fade-in zoom-in duration-300">
          {filtrosUI}
        </div>
      )}

      {!showResumen && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <KpiCard
            label="Fondos activos"
            value={String(stats.activos)}
            icon="pi pi-users"
            accent
          />
          <KpiCard
            label="Total desembolsado"
            value={money(stats.totalDesembolsado)}
            icon="pi pi-arrow-down-left"
          />
          <KpiCard
            label="Total gastado"
            value={money(stats.totalGastado)}
            icon="pi pi-wallet"
          />
          <KpiCard
            label="Residentes en alerta"
            value={String(stats.alertas)}
            tone={stats.alertas > 0 ? "text-red-600" : "text-slate-800"}
            icon="pi pi-exclamation-triangle"
          />
        </div>
      )}

      {showResumen ? (
        <div className="rounded-[1.8rem] border border-black/5 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)] overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="px-5 py-4 border-b border-black/5 bg-[#F9F9F6]">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C98500]">
                  Resumen por residente
                </p>
                <h3 className="mt-1 text-[22px] font-black tracking-tight text-slate-800">
                  Estado actual
                </h3>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-5">
            {resumenesFiltrados.length === 0 ? (
              <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-white p-10 text-center">
                <p className="text-[12px] font-medium text-slate-400">
                  No hay resultados para los filtros aplicados.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {resumenesFiltrados.map((item, i) => (
                  <div
                    key={`${item.residente}-${i}`}
                    className="rounded-[1.4rem] border border-black/5 bg-[#F9F9F6] p-4 md:p-5"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C98500]">
                          Residente
                        </p>
                        <h4 className="mt-2 text-[20px] font-black tracking-tight text-slate-800 break-words">
                          {item.residente || "SIN RESIDENTE"}
                        </h4>
                      </div>

                      <span
                        className={`inline-flex px-3 py-1.5 rounded-full border text-[11px] font-semibold ${estadoTone(
                          item.estado
                        )}`}
                      >
                        {item.estado || "SIN FONDO"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-[1rem] border border-black/5 bg-white p-3">
                        <p className="text-[10px] font-medium text-slate-500">Asignado</p>
                        <p className="mt-2 text-[13px] font-black text-slate-800">
                          {money(item.montoActualAsignado)}
                        </p>
                      </div>

                      <div className="rounded-[1rem] border border-black/5 bg-white p-3">
                        <p className="text-[10px] font-medium text-slate-500">Gastado</p>
                        <p className="mt-2 text-[13px] font-black text-slate-800">
                          {money(item.gastadoActual)}
                        </p>
                      </div>

                      <div className="rounded-[1rem] border border-black/5 bg-white p-3">
                        <p className="text-[10px] font-medium text-slate-500">Saldo</p>
                        <p
                          className={`mt-2 text-[13px] font-black ${
                            Number(item.saldoActual) < 0
                              ? "text-red-600"
                              : Number(item.saldoActual) === 0
                              ? "text-amber-600"
                              : "text-green-600"
                          }`}
                        >
                          {money(item.saldoActual)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4 rounded-[1rem] border border-black/5 bg-white px-4 py-3">
                      <div>
                        <p className="text-[10px] font-medium text-slate-500">
                          Último desembolso
                        </p>
                        <p className="mt-1 text-[12px] font-black text-slate-800">
                          {item.fechaUltimoDesembolso || "SIN REGISTRO"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setData({
                            residente: item.residente,
                            fechaDesembolso: hoyISO(),
                            monto: "",
                            observacion: "",
                          });
                          setShowModal(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#FCB017]"
                      >
                        <i className="pi pi-refresh text-[11px]" />
                        <span>Reponer</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-[1.8rem] border border-black/5 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 bg-[#F9F9F6]">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C98500]">
                  Historial
                </p>
                <h3 className="mt-1 text-[22px] font-black tracking-tight text-slate-800">
                  Desembolsos
                </h3>
              </div>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-white border-b border-black/5">
                <tr>
                  <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500">
                    Fecha
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500">
                    Proyecto
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500">
                    Residente
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500">
                    Monto
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500">
                    Saldo anterior
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500">
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody>
                {historialFiltrado.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-10 text-center">
                      <p className="text-[12px] font-medium text-slate-400">
                        Aún no hay desembolsos registrados.
                      </p>
                    </td>
                  </tr>
                ) : (
                  historialFiltrado.map((item) => {
                    const estadoVisual = getEstadoHistorialVisual(item);

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-black/[0.04] hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <p className="text-[12px] font-black text-slate-800">
                            {item.fechaDesembolso}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[12px] font-semibold text-slate-600">
                            {item.proyecto || "GENERAL"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[12px] font-semibold text-slate-600">
                            {item.residente || "SIN RESIDENTE"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[12px] font-black text-slate-800">
                            {money(item.montoDesembolsado)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p
                            className={`text-[12px] font-black ${
                              Number(item.saldoFinalAntesReposicion) < 0
                                ? "text-red-600"
                                : "text-slate-800"
                            }`}
                          >
                            {money(item.saldoFinalAntesReposicion)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex px-3 py-1.5 rounded-full border text-[11px] font-semibold ${estadoVisual.tone}`}
                          >
                            {estadoVisual.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {historialFiltrado.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-black/10 p-8 text-center">
                <p className="text-[12px] font-medium text-slate-400">
                  Aún no hay desembolsos registrados.
                </p>
              </div>
            ) : (
              historialFiltrado.map((item) => {
                const estadoVisual = getEstadoHistorialVisual(item);

                return (
                  <div
                    key={item.id}
                    className="rounded-[1.35rem] border border-black/5 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-black text-slate-800">
                          {item.residente || "SIN RESIDENTE"}
                        </p>
                        <p className="mt-1 text-[12px] font-medium text-slate-500">
                          {item.proyecto || "GENERAL"}
                        </p>
                      </div>

                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-semibold ${estadoVisual.tone}`}
                      >
                        {estadoVisual.label}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-medium text-slate-500">Fecha</p>
                        <p className="mt-1 text-[12px] font-black text-slate-800">
                          {item.fechaDesembolso}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-medium text-slate-500">Monto</p>
                        <p className="mt-1 text-[12px] font-black text-slate-800">
                          {money(item.montoDesembolsado)}
                        </p>
                      </div>

                      <div className="col-span-2">
                        <p className="text-[10px] font-medium text-slate-500">Saldo anterior</p>
                        <p
                          className={`mt-1 text-[12px] font-black ${
                            Number(item.saldoFinalAntesReposicion) < 0
                              ? "text-red-600"
                              : "text-slate-800"
                          }`}
                        >
                          {money(item.saldoFinalAntesReposicion)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <ModalCajaChica
        show={showModal}
        onClose={cerrarModal}
        onSave={guardarDesembolso}
        data={data}
        setData={setData}
        mensajeExito={mensajeExito}
      />
    </div>
  );
};

export default CajaChicaView;