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

export const slugifyName = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");

export const buildResidentEmail = (nombre) => {
  const slug = slugifyName(nombre);
  return `${slug}@blendfortdemo.com`;
};

export const getCajaChicaEstado = (montoAsignado, gastadoActual) => {
  const monto = safeNum(montoAsignado);
  const gastado = safeNum(gastadoActual);
  const saldo = monto - gastado;

  if (monto <= 0) {
    return {
      estado: "SIN FONDO",
      saldo,
      gastado,
      monto,
    };
  }

  if (saldo < 0) {
    return {
      estado: "EXCEDIDA",
      saldo,
      gastado,
      monto,
    };
  }

  if (saldo === 0) {
    return {
      estado: "AGOTADA",
      saldo,
      gastado,
      monto,
    };
  }

  const ratio = monto > 0 ? saldo / monto : 0;

  if (ratio <= 0.2) {
    return {
      estado: "POR AGOTARSE",
      saldo,
      gastado,
      monto,
    };
  }

  return {
    estado: "DISPONIBLE",
    saldo,
    gastado,
    monto,
  };
};