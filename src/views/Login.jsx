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

  const IconoOjo = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5 transition-all duration-300"
    >
      {verPassword ? (
        <g>
          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
          <path
            fillRule="evenodd"
            d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"
            clipRule="evenodd"
          />
        </g>
      ) : (
        <path
          fillRule="evenodd"
          d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.396l-1.435-1.435a9.75 9.75 0 002.339-3.527c.06-.17.06-.354 0-.523-1.446-4.34-5.556-7.464-10.326-7.464a9.758 9.758 0 00-4.053.873L5.035 3.326a11.247 11.247 0 016.588-1.576c4.77 0 8.88 3.123 10.326 7.464.06.17.06.354 0 .523zM12.126 7.032a4.125 4.125 0 014.842 4.842l-4.842-4.842zM7.602 9.123l1.29 1.29A4.125 4.125 0 0013.587 15.1l1.29 1.29a5.625 5.625 0 01-7.275-7.275zM1.323 11.447a11.249 11.249 0 002.631 4.396l1.435 1.435a9.75 9.75 0 01-2.339-3.527c-.06-.17-.06-.354 0-.523 1.446-4.34 5.556-7.464 10.326-7.464a9.757 9.757 0 014.053.873l1.528 1.528a11.247 11.247 0 00-6.588-1.576c-4.77 0-8.88 3.123-10.326 7.464a.859.859 0 000 .523z"
          clipRule="evenodd"
        />
      )}
    </svg>
  );

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

  const manejarCambioPassword = (e) => {
    setPassword(e.target.value);
    resetError();
  };

  const accesoResidente = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);

    try {
      const nombreInput = String(nombre || "").trim();
      const passOk = password === "Blendfort2026";

      if (!nombreInput || !passOk) {
        setError({ show: true, msg: "CONTRASEÑA O NOMBRE INCORRECTO" });
        return;
      }

      await loginResidente(nombreInput);
    } catch (err) {
      console.error("Error login residente:", err);

      const msg = String(err?.message || "").trim();

      if (msg) {
        setError({ show: true, msg: msg.toUpperCase() });
      } else {
        setError({ show: true, msg: "NO SE PUDO INICIAR SESIÓN" });
      }
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
      console.error("Error login admin:", err);
      setError({ show: true, msg: "NO SE PUDO INICIAR SESIÓN" });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#f8f6f1] flex items-center justify-center p-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-blendfort-naranja/20 blur-3xl" />
          <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="absolute -bottom-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-100/30 blur-3xl" />
        </div>

        <div className="relative bg-white/90 backdrop-blur-md w-full max-w-md rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-2xl text-center border border-white/60">
          <div className="flex items-center justify-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blendfort-naranja animate-pulse"></div>
            <p className="font-black uppercase tracking-[0.22em] text-black/50 text-[11px]">
              Cargando sesión...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8f6f1] flex flex-col items-center justify-center p-5 md:p-6 text-black">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-80px] left-[-60px] h-[260px] w-[260px] rounded-full bg-blendfort-naranja/20 blur-3xl md:h-[340px] md:w-[340px]" />
        <div className="absolute top-[18%] right-[-80px] h-[240px] w-[240px] rounded-full bg-amber-200/30 blur-3xl md:h-[320px] md:w-[320px]" />
        <div className="absolute bottom-[-100px] left-[8%] h-[220px] w-[220px] rounded-full bg-orange-100/30 blur-3xl md:h-[280px] md:w-[280px]" />
        <div className="absolute bottom-[-120px] right-[10%] h-[260px] w-[260px] rounded-full bg-yellow-100/30 blur-3xl md:h-[320px] md:w-[320px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0.08)_45%,transparent_75%)]" />
      </div>

      <div className="relative bg-white/88 backdrop-blur-xl w-full max-w-md rounded-[2rem] md:rounded-[2.5rem] px-6 py-8 md:px-10 md:py-10 shadow-[0_30px_80px_rgba(0,0,0,0.10)] text-center border border-white/70">
        <div className="mb-6 md:mb-8 flex justify-center">
          <img
            src={logo}
            alt="Logo Blendfort"
            className="h-32 md:h-44 w-auto object-contain drop-shadow-[0_8px_20px_rgba(245,158,11,0.12)]"
          />
        </div>

        <h1 className="text-3xl md:text-3xl font-black mb-1 tracking-tighter uppercase">
          BLENDFORT
        </h1>
        <p className="font-medium mb-8 md:mb-10 opacity-60">Control de Egresos</p>

        {paso === "seleccion" && (
          <div className="space-y-4 md:space-y-5 animate-in fade-in duration-300">
            <button
              onClick={irAResidente}
              disabled={submitting}
              className="w-full bg-white text-black py-4 rounded-xl font-black text-base md:text-lg border-2 border-blendfort-naranja transition-all duration-300 hover:bg-blendfort-naranja hover:text-white active:scale-95 shadow-sm uppercase disabled:opacity-60"
            >
              <span className="lg:hidden">RESIDENTE</span>
              <span className="hidden lg:inline">ENTRAR COMO RESIDENTE</span>
            </button>

            <button
              onClick={irAAdmin}
              disabled={submitting}
              className="w-full bg-white text-black py-4 rounded-xl font-black text-base md:text-lg border-2 border-black transition-all duration-300 hover:bg-black hover:text-white active:scale-95 shadow-sm uppercase disabled:opacity-60"
            >
              <span className="lg:hidden">ADMINISTRADOR</span>
              <span className="hidden lg:inline">ENTRAR COMO ADMINISTRADOR</span>
            </button>
          </div>
        )}

        {paso === "form_residente" && (
          <form
            onSubmit={accesoResidente}
            className="space-y-4 text-left animate-in slide-in-from-right duration-300"
          >
            <div>
              <label className="text-[10px] font-black uppercase ml-1 opacity-70">
                Nombre completo
              </label>
              <input
                autoFocus
                type="text"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  resetError();
                }}
                placeholder="Ej. Juan Pérez"
                className="w-full mt-1 bg-blendfort-fondo border-2 border-transparent focus:border-blendfort-naranja outline-none p-4 rounded-xl text-base md:text-[16px] font-bold transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase ml-1 opacity-70">
                Contraseña
              </label>

              <div className="relative">
                <input
                  type={verPassword ? "text" : "password"}
                  value={password}
                  onChange={manejarCambioPassword}
                  placeholder="••••••••"
                  className={`w-full mt-1 bg-blendfort-fondo border-2 outline-none p-4 pr-12 rounded-xl text-base md:text-[16px] font-bold transition-all ${
                    error.show
                      ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                      : "border-transparent focus:border-blendfort-naranja"
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black opacity-30 hover:opacity-100 transition-opacity p-1"
                  aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <IconoOjo />
                </button>
              </div>

              {error.show && (
                <p className="text-red-500 text-[10px] font-bold mt-2 ml-1 animate-pulse uppercase tracking-widest">
                  {error.msg}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blendfort-naranja text-white py-4 rounded-xl font-black text-base md:text-lg shadow-md hover:brightness-105 transition-all uppercase mt-2 disabled:opacity-60"
            >
              {submitting ? "INGRESANDO..." : "ACCEDER"}
            </button>

            <button
              type="button"
              onClick={irASeleccion}
              className="w-full text-[10px] font-black uppercase opacity-40 hover:opacity-100 py-2 text-center"
            >
              ← Volver a roles
            </button>
          </form>
        )}

        {paso === "form_admin" && (
          <form
            onSubmit={accesoAdmin}
            className="space-y-4 text-left animate-in slide-in-from-right duration-300"
          >
            <div>
              <label className="text-[10px] font-black uppercase ml-1 opacity-70">
                Clave de Administrador
              </label>

              <div className="relative">
                <input
                  autoFocus
                  type={verPassword ? "text" : "password"}
                  value={password}
                  onChange={manejarCambioPassword}
                  placeholder="••••••••"
                  className={`w-full mt-1 bg-blendfort-fondo border-2 outline-none p-4 pr-12 rounded-xl text-base md:text-[16px] font-bold transition-all ${
                    error.show
                      ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                      : "border-transparent focus:border-black"
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black opacity-30 hover:opacity-100 transition-opacity p-1"
                  aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <IconoOjo />
                </button>
              </div>

              {error.show && (
                <p className="text-red-500 text-[10px] font-bold mt-2 ml-1 animate-pulse uppercase tracking-widest">
                  {error.msg}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-black text-white py-4 rounded-xl font-black text-base md:text-lg shadow-md hover:opacity-80 transition-all uppercase mt-2 disabled:opacity-60"
            >
              {submitting ? "INGRESANDO..." : "ACCEDER"}
            </button>

            <button
              type="button"
              onClick={irASeleccion}
              className="w-full text-[10px] font-black uppercase opacity-40 hover:opacity-100 py-2 text-center"
            >
              ← Volver a roles
            </button>
          </form>
        )}

        <div className="mt-10 md:mt-12 text-[10px] opacity-30 font-bold uppercase tracking-widest">
          Sistema de Control Interno
        </div>
      </div>
    </div>
  );
};

export default Login;