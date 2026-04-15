import React, { useMemo, useState } from "react";
import CustomSelect from "./CustomSelect";
import ModalAccesoCliente from "./ModalAccesoCliente";

/* ===========================
   Helpers
=========================== */
const normU = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const shouldCountInTotals = (e) => {
  const cat = normU(e?.categoria);
  const est = normU(e?.estado || "PENDIENTE");

  if (est === "ANULADO") return false;

  if (cat === "MANO DE OBRA") {
    return est === "PAGADO" || est === "COMPLETADO";
  }

  return true;
};

const progressWidth = (gasto, presupuesto) => {
  const p = Number(presupuesto) || 0;
  const g = Number(gasto) || 0;
  if (!p || p <= 0) return 0;
  return Math.min((g / p) * 100, 100);
};

const toneDisponible = (disponible) => {
  if (Number(disponible) < 0) {
    return {
      card: "border-red-200 bg-red-50/70",
      text: "text-red-700",
      chip: "bg-red-100 text-red-700 border-red-200",
      label: "EXCEDIDO",
    };
  }

  return {
    card: "border-green-200 bg-green-50/70",
    text: "text-green-700",
    chip: "bg-green-100 text-green-700 border-green-200",
    label: "DISPONIBLE",
  };
};

const KpiCard = ({ icon, label, value, hint, accent = false }) => (
  <div
    className={`rounded-[1.5rem] border p-4 md:p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${
      accent
        ? "border-[#FCB017]/25 bg-[#FFF8E8]"
        : "border-black/5 bg-white"
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        <h3 className="mt-2 text-[22px] md:text-[26px] xl:text-[28px] font-black tracking-tight text-slate-800 leading-none">
          {value}
        </h3>
        {hint ? (
          <p className="mt-2 text-[11px] md:text-[12px] font-medium text-slate-500 leading-snug">
            {hint}
          </p>
        ) : null}
      </div>

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
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

const InfoPill = ({ icon, children, accent = false }) => (
  <div
    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
      accent
        ? "border-[#FCB017]/20 bg-[#FFF8E8] text-[#C98500]"
        : "border-transparent bg-slate-100 text-slate-600"
    }`}
  >
    <i className={`${icon} text-[11px]`} />
    <span className="truncate">{children}</span>
  </div>
);

const ActionButton = ({
  onClick,
  icon,
  label,
  tone = "default",
  mobileSquare = false,
}) => {
  const base =
    tone === "danger"
      ? "bg-white border border-red-200 text-red-600 hover:bg-red-50"
      : tone === "accent"
      ? "bg-[#FFF8E8] border border-[#FCB017]/25 text-[#C98500] hover:bg-[#FCB017] hover:text-white"
      : "bg-white border border-black/10 text-slate-700 hover:border-[#FCB017] hover:text-[#C98500]";

  return (
    <button
      onClick={onClick}
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl md:rounded-2xl transition-all active:scale-95 shadow-sm ${base} ${
        mobileSquare
          ? "h-11 w-11 md:h-auto md:w-auto md:px-4 md:py-3"
          : "px-4 py-3"
      }`}
    >
      <i className={`${icon} text-[13px]`} />
      <span className="hidden md:inline text-[10px] font-black uppercase tracking-[0.18em]">
        {label}
      </span>
    </button>
  );
};

const EmptyState = ({ onNew }) => (
  <div className="space-y-4">
    <div className="flex justify-end">
      <button
        onClick={onNew}
        type="button"
        className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#FCB017]"
      >
        <i className="pi pi-plus text-[12px]" />
        <span>Nuevo proyecto</span>
      </button>
    </div>

    <div className="rounded-[1.8rem] border border-black/5 bg-white p-8 md:p-10 text-center shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FCB017]/20 bg-[#FFF8E8] text-[#C98500]">
        <i className="pi pi-briefcase text-[18px]" />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
        Gestión de proyectos
      </p>

      <h3 className="mt-3 text-2xl md:text-3xl font-black tracking-tight text-slate-800">
        No hay proyectos activos
      </h3>

      <p className="mt-3 text-[13px] md:text-[14px] font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
        Crea tu primer proyecto para empezar a gestionar presupuesto,
        residentes y portal cliente.
      </p>

      <button
        onClick={onNew}
        type="button"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#FCB017] px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-slate-800"
      >
        <i className="pi pi-plus text-[12px]" />
        <span>Crear proyecto</span>
      </button>
    </div>
  </div>
);

const GestionProyectos = ({
  proyectos = [],
  egresos = [],
  onEdit,
  onDelete,
  onBack,
  onNew,
}) => {
  const [proyectoActivoIndex, setProyectoActivoIndex] = useState(0);
  const [showModalClienteAccess, setShowModalClienteAccess] = useState(false);
  const [proyectoPortalCliente, setProyectoPortalCliente] = useState(null);

  const opcionesProyectos = useMemo(
    () => (proyectos || []).map((p) => p?.nombre).filter(Boolean),
    [proyectos]
  );

  const safeIndex = useMemo(() => {
    if (!proyectos?.length) return 0;
    return Math.min(Math.max(0, proyectoActivoIndex), proyectos.length - 1);
  }, [proyectos?.length, proyectoActivoIndex]);

  const proy = proyectos?.[safeIndex] || null;

  const gastoReal = useMemo(() => {
    const nombre = proy?.nombre;
    if (!nombre) return 0;

    return (egresos || [])
      .filter((e) => normU(e?.proyecto) === normU(nombre))
      .reduce((acc, curr) => {
        if (!shouldCountInTotals(curr)) return acc;
        return acc + (Number(curr?.valor) || 0);
      }, 0);
  }, [egresos, proy?.nombre]);

  const presupuesto = useMemo(
    () => Number(proy?.presupuesto) || 0,
    [proy?.presupuesto]
  );

  const porcentajeGasto = useMemo(() => {
    if (!presupuesto) return 0;
    return Math.min((gastoReal / presupuesto) * 100, 999);
  }, [gastoReal, presupuesto]);

  const disponible = useMemo(
    () => presupuesto - gastoReal,
    [presupuesto, gastoReal]
  );

  const excedido = disponible < 0;

  const residentes = useMemo(() => {
    if (Array.isArray(proy?.residentes) && proy.residentes.length) {
      return proy.residentes;
    }
    if (proy?.residente) return [proy.residente];
    return [];
  }, [proy]);

  const abrirPortalCliente = (proyecto) => {
    setProyectoPortalCliente(proyecto || null);
    setShowModalClienteAccess(true);
  };

  if (!proyectos?.length) {
    return (
      <>
        <EmptyState onNew={onNew} />

        <ModalAccesoCliente
          show={showModalClienteAccess}
          onClose={() => {
            setShowModalClienteAccess(false);
            setProyectoPortalCliente(null);
          }}
          proyecto={proyectoPortalCliente}
        />
      </>
    );
  }

  const disponibleTone = toneDisponible(disponible);

  return (
    <>
      <div className="space-y-4 md:space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FCB017]/20 bg-[#FFF8E8] px-3 py-1.5 text-[11px] font-semibold text-[#C98500]">
              <i className="pi pi-briefcase text-[11px]" />
              <span>Gestión de proyectos</span>
            </div>

            <h2 className="mt-3 text-[28px] md:text-[34px] xl:text-[38px] font-black tracking-tight text-slate-800 leading-none">
              {proy?.nombre || "Proyecto"}
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">
              {proy?.dueno ? (
                <InfoPill icon="pi pi-user" accent>
                  {normU(proy.dueno)}
                </InfoPill>
              ) : null}

              {proy?.ubicacion ? (
                <InfoPill icon="pi pi-map-marker">
                  {normU(proy.ubicacion)}
                </InfoPill>
              ) : null}

              {proy?.tiempo ? (
                <InfoPill icon="pi pi-clock">
                  {normU(proy.tiempo)}
                </InfoPill>
              ) : null}
            </div>
          </div>

          <div className="self-start">
            <button
              onClick={onNew}
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#FCB017]"
            >
              <i className="pi pi-plus text-[12px]" />
              <span>Proyecto</span>
            </button>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-black/5 bg-white p-4 md:p-5 xl:p-6 shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 xl:gap-5">
            <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4 xl:gap-5 items-start">
              <div>
                <CustomSelect
                  label="Proyecto activo"
                  options={opcionesProyectos}
                  value={proy?.nombre || ""}
                  onChange={(val) => {
                    const idx = proyectos.findIndex((p) => p?.nombre === val);
                    setProyectoActivoIndex(idx >= 0 ? idx : 0);
                  }}
                  placeholder="PROYECTO..."
                  allowCustom={false}
                />
              </div>

              <div className="flex flex-wrap xl:justify-end gap-2">
                <ActionButton
                  onClick={() => onEdit?.(proy)}
                  icon="pi pi-pencil"
                  label="Editar"
                  mobileSquare
                />

                <ActionButton
                  onClick={() => abrirPortalCliente(proy)}
                  icon="pi pi-eye"
                  label="Portal Cliente"
                  tone="accent"
                  mobileSquare
                />

                <ActionButton
                  onClick={() => onDelete?.(proy)}
                  icon="pi pi-trash"
                  label="Eliminar"
                  tone="danger"
                  mobileSquare
                />
              </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 xl:gap-4">
              <KpiCard
                icon="pi pi-chart-bar"
                label="Presupuesto"
                value={`$ ${money(presupuesto)}`}
                hint="Asignado"
                accent
              />
              <KpiCard
                icon="pi pi-wallet"
                label="Inversión"
                value={`$ ${money(gastoReal)}`}
                hint={`${Math.min(porcentajeGasto, 999).toFixed(1)}% consumido`}
              />
              <KpiCard
                icon="pi pi-check-circle"
                label="Disponible"
                value={`$ ${money(Math.abs(disponible))}`}
                hint={excedido ? "Presupuesto excedido" : "Saldo del proyecto"}
              />
              <KpiCard
                icon="pi pi-users"
                label="Residentes"
                value={`${residentes.length}`}
                hint={residentes.length ? "Asignados" : "Sin asignar"}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4 xl:gap-5">
              <div className="rounded-[1.5rem] border border-black/5 bg-[#F9F9F6] p-4 md:p-5 xl:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold tracking-[0.18em] text-[#C98500] uppercase">
                      Resumen del proyecto
                    </p>

                    <h3 className="mt-2 text-[22px] md:text-[24px] xl:text-[26px] font-black tracking-tight text-slate-800">
                      {proy?.nombre || "Proyecto"}
                    </h3>

                    <p className="mt-2 text-[13px] font-medium text-slate-500 leading-relaxed max-w-2xl">
                      Vista general del estado financiero del proyecto, sus
                      responsables y el acceso del portal cliente.
                    </p>
                  </div>

                  <div
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${disponibleTone.chip}`}
                  >
                    <i
                      className={`pi ${
                        excedido ? "pi-exclamation-triangle" : "pi-check-circle"
                      } text-[11px]`}
                    />
                    <span>{disponibleTone.label}</span>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-[12px] font-semibold">
                    <span className="text-slate-500">Consumo del presupuesto</span>
                    <span className="text-slate-800 font-black">
                      {Math.min(porcentajeGasto, 999).toFixed(1)}%
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-white border border-black/5">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        porcentajeGasto >= 100
                          ? "bg-red-500"
                          : porcentajeGasto > 90
                          ? "bg-amber-500"
                          : "bg-[#FCB017]"
                      }`}
                      style={{ width: `${progressWidth(gastoReal, presupuesto)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`rounded-[1.35rem] border p-4 ${disponibleTone.card}`}>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Estado del disponible
                    </p>
                    <p className={`mt-2 text-[24px] xl:text-[26px] font-black tracking-tight ${disponibleTone.text}`}>
                      $ {money(Math.abs(disponible))}
                    </p>
                    <p className="mt-2 text-[12px] font-medium text-slate-500">
                      {excedido
                        ? "El gasto ya superó el presupuesto asignado."
                        : "Saldo restante disponible para el proyecto."}
                    </p>
                  </div>

                  <div className="rounded-[1.35rem] border border-black/5 bg-white p-4">
                    <p className="text-[11px] font-semibold text-slate-500">
                      Presupuesto vs gasto
                    </p>

                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[12px] font-medium text-slate-500">
                          Presupuesto
                        </span>
                        <span className="text-[13px] font-black text-slate-800">
                          $ {money(presupuesto)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[12px] font-medium text-slate-500">
                          Gasto real
                        </span>
                        <span className="text-[13px] font-black text-slate-800">
                          $ {money(gastoReal)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[12px] font-medium text-slate-500">
                          Consumo
                        </span>
                        <span className="text-[13px] font-black text-slate-800">
                          {Math.min(porcentajeGasto, 999).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-black/5 bg-white p-4 md:p-5 xl:p-6">
                <p className="text-[11px] font-bold tracking-[0.18em] text-[#C98500] uppercase">
                  Residentes a cargo
                </p>

                <h3 className="mt-2 text-[22px] md:text-[24px] xl:text-[26px] font-black tracking-tight text-slate-800">
                  Equipo responsable
                </h3>

                {residentes.length ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {residentes.map((r, i) => (
                      <span
                        key={`${r}-${i}`}
                        className="inline-flex items-center gap-2 rounded-full bg-[#FFF8E8] border border-[#FCB017]/20 px-3 py-1.5 text-[11px] font-semibold text-[#C98500]"
                      >
                        <i className="pi pi-user text-[10px]" />
                        <span>{String(r).toUpperCase()}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-[12px] font-medium text-slate-500">
                    Sin residente asignado.
                  </p>
                )}

                <div className="mt-5 rounded-[1.35rem] border border-black/5 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold text-slate-500">
                    Portal cliente
                  </p>
                  <p className="mt-2 text-[13px] font-medium text-slate-600 leading-relaxed">
                    Administra desde aquí el acceso visual del cliente para este
                    proyecto.
                  </p>

                  <button
                    type="button"
                    onClick={() => abrirPortalCliente(proy)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#FCB017] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-slate-800"
                  >
                    <i className="pi pi-eye text-[12px]" />
                    <span>Abrir portal cliente</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ModalAccesoCliente
        show={showModalClienteAccess}
        onClose={() => {
          setShowModalClienteAccess(false);
          setProyectoPortalCliente(null);
        }}
        proyecto={proyectoPortalCliente}
      />
    </>
  );
};

export default GestionProyectos;