import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ClienteAccessContext = createContext(null);
const STORAGE_KEY = "blendfort_cliente_session";

export const ClienteAccessProvider = ({ children }) => {
  const [clienteSesion, setClienteSesion] = useState(null);
  const [clienteDashboard, setClienteDashboard] = useState(null);
  const [clienteLoading, setClienteLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [clienteError, setClienteError] = useState("");

  const saveClienteSession = (session) => {
    setClienteSesion(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  };

  const clearClienteSession = () => {
    setClienteSesion(null);
    setClienteDashboard(null);
    setClienteError("");
    localStorage.removeItem(STORAGE_KEY);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        setClienteLoading(false);
        return;
      }

      const parsed = JSON.parse(saved);

      if (
        parsed?.activo &&
        parsed?.codigoAcceso &&
        parsed?.proyectoId
      ) {
        setClienteSesion(parsed);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error("Error leyendo sesión cliente:", error);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setClienteLoading(false);
    }
  }, []);

  const recargarDashboardCliente = useCallback(
    async (sessionOverride) => {
      const sesion = sessionOverride || clienteSesion || null;

      const proyectoId = String(sesion?.proyectoId || "").trim();
      const codigoAcceso = String(sesion?.codigoAcceso || "")
        .trim()
        .toUpperCase();

      if (!proyectoId || !codigoAcceso) {
        setClienteDashboard(null);
        return null;
      }

      setDashboardLoading(true);
      setClienteError("");

      try {
        const res = await fetch("/api/cliente-dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proyectoId,
            codigoAcceso,
          }),
        });

        let json = {};
        try {
          json = await res.json();
        } catch {
          json = {};
        }

        if (!res.ok) {
          throw new Error(
            json?.error || "NO SE PUDO CARGAR EL PANEL DEL CLIENTE"
          );
        }

        setClienteDashboard(json);
        return json;
      } catch (error) {
        console.error("Error cargando dashboard cliente:", error);
        setClienteError(
          error?.message || "NO SE PUDO CARGAR EL PANEL DEL CLIENTE"
        );
        throw error;
      } finally {
        setDashboardLoading(false);
      }
    },
    [clienteSesion]
  );

  const loginCliente = async (codigoAcceso) => {
    try {
      const codigoFinal = String(codigoAcceso || "")
        .trim()
        .toUpperCase();

      if (!codigoFinal) {
        throw new Error("CÓDIGO DE ACCESO REQUERIDO");
      }

      setClienteError("");

      const res = await fetch("/api/cliente-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          codigoAcceso: codigoFinal,
        }),
      });

      let json = {};
      try {
        json = await res.json();
      } catch {
        json = {};
      }

      if (!res.ok) {
        throw new Error(json?.error || "NO SE PUDO INICIAR SESIÓN DEL CLIENTE");
      }

      const session = json?.session || null;

      if (
        !session?.activo ||
        !session?.codigoAcceso ||
        !session?.proyectoId
      ) {
        throw new Error("LA SESIÓN CLIENTE DEVUELTA ES INVÁLIDA");
      }

      saveClienteSession(session);
      await recargarDashboardCliente(session);

      return json;
    } catch (error) {
      console.error("Error login cliente:", error);
      setClienteError(
        error?.message || "NO SE PUDO INICIAR EL ACCESO CLIENTE"
      );
      throw error;
    }
  };

  const logoutCliente = () => {
    clearClienteSession();
  };

  useEffect(() => {
    if (clienteLoading) return;
    if (!clienteSesion?.activo || !clienteSesion?.codigoAcceso || !clienteSesion?.proyectoId) {
      return;
    }

    recargarDashboardCliente(clienteSesion).catch(() => {});
  }, [clienteLoading, clienteSesion, recargarDashboardCliente]);

  const value = useMemo(
    () => ({
      clienteSesion,
      clienteDashboard,
      clienteLoading,
      dashboardLoading,
      clienteError,
      loginCliente,
      logoutCliente,
      recargarDashboardCliente,
      clearClienteSession,
    }),
    [
      clienteSesion,
      clienteDashboard,
      clienteLoading,
      dashboardLoading,
      clienteError,
      recargarDashboardCliente,
    ]
  );

  return (
    <ClienteAccessContext.Provider value={value}>
      {children}
    </ClienteAccessContext.Provider>
  );
};

export const useClienteAccess = () => {
  const ctx = useContext(ClienteAccessContext);

  if (!ctx) {
    throw new Error(
      "useClienteAccess debe usarse dentro de ClienteAccessProvider"
    );
  }

  return ctx;
};