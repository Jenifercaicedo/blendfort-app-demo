export const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export const safeNum = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

export const ensureISODate = (d) => String(d || "").slice(0, 10);

export const getCajaChicaEstado = (montoAsignado, gastadoActual) => {
  const monto = safeNum(montoAsignado);
  const gastado = safeNum(gastadoActual);
  const saldo = monto - gastado;

  if (monto <= 0) return "SIN FONDO";
  if (saldo < 0) return "EXCEDIDA";
  if (saldo === 0) return "AGOTADA";
  if (saldo / monto <= 0.2) return "POR AGOTARSE";
  return "DISPONIBLE";
};