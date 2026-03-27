import React from "react";
import Login from "./views/Login";
import ResidentDashboard from "./views/ResidentDashboard";
import AdminDashboard from "./views/AdminDashboard";
import { AppProvider, useAppContext } from "./context/AppContext";

function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

function MainApp() {
  const { usuario } = useAppContext();

  const rol = String(usuario || "").toUpperCase().trim();

  if (!usuario) {
    return (
      <div className="min-h-screen bg-blendfort-fondo">
        <Login />
      </div>
    );
  }

  if (rol === "RESIDENTE") {
    return (
      <div className="min-h-screen bg-blendfort-fondo">
        <ResidentDashboard />
      </div>
    );
  }

  if (rol === "ADMIN") {
    return (
      <div className="min-h-screen bg-blendfort-fondo">
        <AdminDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blendfort-fondo flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-2xl text-center border border-black/5">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.22em] text-black/40">
            Estado de sesión
          </p>
        </div>

        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black">
          Error de sesión
        </h2>

        <p className="mt-3 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.18em] text-black/35 leading-relaxed">
          El rol actual no es válido. Cierra sesión y vuelve a ingresar.
        </p>
      </div>
    </div>
  );
}

export default App;