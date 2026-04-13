import React, { useState } from "react";
import logo from "../assets/logo-blendfort.png";
import { useAppContext } from "../context/AppContext";

const Login = () => {
  const { loginAdmin, loginResidente, authLoading } = useAppContext();

  const [paso, setPaso] = useState("seleccion");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState({ show: false, msg: "" });
  const [verPassword, setVerPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetError = () => {
    if (error.show) setError({ show: false, msg: "" });
  };

  const limpiarFormulario = ({ limpiarNombre = false } = {}) => {
    setPassword("");
    setVerPassword(false);
    setError({ show: false, msg: "" });
    if (limpiarNombre) setNombre("");
  };

  const irASeleccion = () => {
    setPaso("seleccion");
    limpiarFormulario();
  };

  const irAResidente = () => {
    setPaso("form_residente");
    limpiarFormulario();
  };

  const irAAdmin = () => {
    setPaso("form_admin");
    limpiarFormulario({ limpiarNombre: true });
  };

  const accesoResidente = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);

    try {
      if (!nombre || password !== "Blendfort2026") {
        setError({ show: true, msg: "CONTRASEÑA O NOMBRE INCORRECTO" });
        return;
      }

      await loginResidente(nombre);
    } catch (err) {
      setError({ show: true, msg: "NO SE PUDO INICIAR SESIÓN" });
    } finally {
      setSubmitting(false);
    }
  };

  const accesoAdmin = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);

    try {
      if (password !== "Blendfortadmin") {
        setError({ show: true, msg: "CONTRASEÑA INCORRECTA" });
        return;
      }

      await loginAdmin();
    } catch (err) {
      setError({ show: true, msg: "NO SE PUDO INICIAR SESIÓN" });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F6F1]">
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          Cargando...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F1] flex">
      
      {/* ===== LEFT (DESKTOP ONLY) ===== */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center bg-[#F6F6F1]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581091012184-7c6a5d3c3a4f')] bg-cover bg-center opacity-20" />

        <div className="relative z-10 max-w-md px-10">
          <h1 className="text-4xl font-black text-slate-800 mb-4">
            Control total de tus proyectos
          </h1>
          <p className="text-slate-500 font-semibold">
            Gestiona egresos, personal y caja chica en un solo sistema.
          </p>
        </div>
      </div>

      {/* ===== RIGHT / MOBILE ===== */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-10">
        
        <div className="w-full max-w-md">
          
          {/* LOGO */}
          <div className="mb-8 text-center">
            <img src={logo} className="h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-black tracking-tight text-slate-800">
              BLENDFORT
            </h1>
            <p className="text-sm text-slate-500">
              Sistema de control de egresos
            </p>
          </div>

          {/* ===== SELECCIÓN ===== */}
          {paso === "seleccion" && (
            <div className="space-y-4">
              <button
                onClick={irAResidente}
                className="w-full border border-[#FCB017] text-[#C98500] py-3 rounded-lg font-bold hover:bg-[#FCB017] hover:text-white transition"
              >
                Entrar como Residente
              </button>

              <button
                onClick={irAAdmin}
                className="w-full border border-black py-3 rounded-lg font-bold hover:bg-black hover:text-white transition"
              >
                Entrar como Administrador
              </button>
            </div>
          )}

          {/* ===== RESIDENTE ===== */}
          {paso === "form_residente" && (
            <form onSubmit={accesoResidente} className="space-y-4">
              
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre completo"
                className="w-full border border-black/10 rounded-lg px-4 py-3 font-semibold"
              />

              <div className="relative">
                <input
                  type={verPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="w-full border border-black/10 rounded-lg px-4 py-3 pr-10 font-semibold"
                />

                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  👁
                </button>
              </div>

              {error.show && (
                <p className="text-red-500 text-xs font-bold">
                  {error.msg}
                </p>
              )}

              <button
                className="w-full bg-[#FCB017] text-white py-3 rounded-lg font-black"
              >
                ACCEDER
              </button>

              <button
                type="button"
                onClick={irASeleccion}
                className="text-xs text-slate-400"
              >
                ← Volver
              </button>
            </form>
          )}

          {/* ===== ADMIN ===== */}
          {paso === "form_admin" && (
            <form onSubmit={accesoAdmin} className="space-y-4">
              
              <div className="relative">
                <input
                  type={verPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Clave administrador"
                  className="w-full border border-black/10 rounded-lg px-4 py-3 pr-10 font-semibold"
                />

                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  👁
                </button>
              </div>

              {error.show && (
                <p className="text-red-500 text-xs font-bold">
                  {error.msg}
                </p>
              )}

              <button className="w-full bg-black text-white py-3 rounded-lg font-black">
                ACCEDER
              </button>

              <button
                type="button"
                onClick={irASeleccion}
                className="text-xs text-slate-400"
              >
                ← Volver
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;