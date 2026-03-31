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
      <div className="min-h-screen bg-blendfort-fondo flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[2rem] border border-black/5 bg-white p-8 md:p-10 shadow-[0_20px_60px_rgba(17,24,39,0.08)] text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-blendfort-naranja animate-pulse" />
            <p className="font-black uppercase tracking-[0.22em] text-black/50 text-[11px]">
              Cargando sesión...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blendfort-fondo px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8 text-black flex items-center justify-center">
      <div className="relative w-full max-w-7xl overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border border-black/5 bg-white shadow-[0_25px_80px_rgba(17,24,39,0.10)]">
        <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative overflow-hidden bg-[#f7f7f3] px-5 pt-6 pb-16 sm:px-7 sm:pt-8 sm:pb-20 md:px-10 md:pt-10 lg:px-12 lg:py-12">
            <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-[#FCB017]/18 blur-2xl" />
            <div className="pointer-events-none absolute right-[-80px] top-[16%] h-72 w-72 rounded-full bg-[#D8D8D8]/45 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-80px] left-[18%] h-52 w-52 rounded-full bg-[#E09826]/18 blur-3xl" />
            <div className="pointer-events-none absolute right-8 bottom-10 h-24 w-24 rounded-[2rem] border border-black/5 bg-white/40 rotate-12" />
            <div className="pointer-events-none absolute left-8 top-24 h-16 w-16 rounded-[1.5rem] border border-black/5 bg-white/50 -rotate-12" />

            <div className="relative z-10 flex h-full flex-col">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-black/8 bg-white/80 px-3 py-2 backdrop-blur-md shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-blendfort-naranja" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-black/55">
                  Sistema interno Blendfort
                </span>
              </div>

              <div className="mt-8 sm:mt-10 lg:mt-12 max-w-xl">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.24em] text-black/45 mb-3">
                  Constructora · Control operativo
                </p>

                <h2 className="text-[2rem] leading-[0.95] sm:text-[2.6rem] md:text-[3.2rem] font-black tracking-[-0.05em] uppercase text-black max-w-[12ch]">
                  Control total para cada proyecto
                </h2>

                <p className="mt-4 max-w-md text-sm sm:text-[15px] md:text-base leading-relaxed text-black/60 font-medium">
                  Gestiona egresos, residentes y operación de obra desde una
                  sola plataforma con la identidad y orden de Blendfort.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <span className="rounded-full border border-black/8 bg-white/80 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-black/60 shadow-sm">
                  Proyectos
                </span>
                <span className="rounded-full border border-black/8 bg-white/80 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-black/60 shadow-sm">
                  Egresos
                </span>
                <span className="rounded-full border border-black/8 bg-white/80 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-black/60 shadow-sm">
                  Caja chica
                </span>
              </div>

              <div className="mt-8 sm:mt-10 lg:mt-auto">
                <div className="relative w-full max-w-[560px] rounded-[2rem] border border-black/5 bg-white/75 p-4 sm:p-5 md:p-6 backdrop-blur-xl shadow-[0_20px_50px_rgba(17,24,39,0.08)]">
                  <div className="absolute -left-3 top-10 hidden sm:block h-12 w-12 rounded-2xl bg-[#FCB017]/90 shadow-lg" />
                  <div className="absolute -right-3 bottom-10 hidden sm:block h-10 w-10 rounded-xl bg-black/90 shadow-lg" />

                  <div className="rounded-[1.6rem] border border-black/5 bg-[#fbfbf8] p-4 sm:p-5 md:p-6">
                    <div className="rounded-[1.5rem] border border-black/5 bg-white px-4 py-5 sm:px-5 sm:py-6 shadow-sm">
                      <img
                        src={logo}
                        alt="Logo Blendfort"
                        className="h-20 sm:h-24 md:h-28 w-auto object-contain mx-auto"
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
                      <div className="rounded-[1.25rem] bg-white border border-black/5 px-3 py-3 shadow-sm">
                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] text-black/40">
                          Estado
                        </p>
                        <p className="mt-1 text-[11px] sm:text-xs font-black uppercase text-black">
                          Activo
                        </p>
                      </div>

                      <div className="rounded-[1.25rem] bg-white border border-black/5 px-3 py-3 shadow-sm">
                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] text-black/40">
                          Diseño
                        </p>
                        <p className="mt-1 text-[11px] sm:text-xs font-black uppercase text-black">
                          Premium
                        </p>
                      </div>

                      <div className="rounded-[1.25rem] bg-white border border-black/5 px-3 py-3 shadow-sm">
                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] text-black/40">
                          Acceso
                        </p>
                        <p className="mt-1 text-[11px] sm:text-xs font-black uppercase text-black">
                          Seguro
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-20 -mt-10 sm:-mt-12 lg:mt-0 px-4 pb-4 sm:px-6 sm:pb-6 md:px-8 lg:px-10 lg:py-10 flex items-center">
            <div className="w-full rounded-[1.8rem] md:rounded-[2.2rem] border border-black/5 bg-white px-5 py-6 sm:px-7 sm:py-8 md:px-8 md:py-9 shadow-[0_18px_45px_rgba(17,24,39,0.10)] lg:shadow-none">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/40 mb-2">
                    Acceso al sistema
                  </p>
                  <h1 className="text-[1.8rem] sm:text-[2rem] md:text-[2.15rem] font-black tracking-[-0.05em] uppercase leading-none text-black">
                    Blendfort
                  </h1>
                  <p className="mt-2 text-sm text-black/55 font-medium">
                    Control de egresos y operación interna
                  </p>
                </div>

                <div className="shrink-0 rounded-[1.25rem] border border-black/5 bg-[#f8f8f5] p-2.5 shadow-sm">
                  <img
                    src={logo}
                    alt="Logo Blendfort"
                    className="h-10 sm:h-11 w-auto object-contain"
                  />
                </div>
              </div>

              {paso === "seleccion" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <button
                    onClick={irAResidente}
                    disabled={submitting}
                    className="group w-full rounded-[1.4rem] border border-blendfort-naranja/35 bg-[#fff9eb] px-4 py-4 sm:px-5 sm:py-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99] disabled:opacity-60"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/40">
                          Acceso de obra
                        </p>
                        <p className="mt-1 text-sm sm:text-base font-black uppercase text-black">
                          Entrar como residente
                        </p>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blendfort-naranja text-black font-black shadow-md transition-transform duration-300 group-hover:translate-x-0.5">
                        →
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={irAAdmin}
                    disabled={submitting}
                    className="group w-full rounded-[1.4rem] border border-black/10 bg-[#f7f7f5] px-4 py-4 sm:px-5 sm:py-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99] disabled:opacity-60"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/40">
                          Acceso general
                        </p>
                        <p className="mt-1 text-sm sm:text-base font-black uppercase text-black">
                          Entrar como administrador
                        </p>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white font-black shadow-md transition-transform duration-300 group-hover:translate-x-0.5">
                        →
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {paso === "form_residente" && (
                <form
                  onSubmit={accesoResidente}
                  className="space-y-4 text-left animate-in slide-in-from-right duration-300"
                >
                  <div className="mb-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">
                      Acceso residente
                    </p>
                    <h3 className="mt-2 text-xl sm:text-[1.45rem] font-black tracking-[-0.04em] uppercase text-black">
                      Bienvenido
                    </h3>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase ml-1 tracking-[0.16em] opacity-65">
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
                      className="w-full mt-1.5 bg-[#f7f7f4] border-2 border-transparent focus:border-blendfort-naranja outline-none p-4 rounded-[1.15rem] text-base md:text-[16px] font-bold transition-all shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase ml-1 tracking-[0.16em] opacity-65">
                      Contraseña
                    </label>

                    <div className="relative">
                      <input
                        type={verPassword ? "text" : "password"}
                        value={password}
                        onChange={manejarCambioPassword}
                        placeholder="••••••••"
                        className={`w-full mt-1.5 bg-[#f7f7f4] border-2 outline-none p-4 pr-12 rounded-[1.15rem] text-base md:text-[16px] font-bold transition-all shadow-sm ${
                          error.show
                            ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                            : "border-transparent focus:border-blendfort-naranja"
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => setVerPassword(!verPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-black opacity-30 hover:opacity-100 transition-opacity p-1"
                        aria-label={
                          verPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
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
                    className="w-full bg-blendfort-naranja text-black py-4 rounded-[1.15rem] font-black text-base md:text-lg shadow-[0_10px_25px_rgba(252,176,23,0.28)] hover:brightness-105 transition-all uppercase mt-2 disabled:opacity-60"
                  >
                    {submitting ? "INGRESANDO..." : "ACCEDER"}
                  </button>

                  <button
                    type="button"
                    onClick={irASeleccion}
                    className="w-full text-[10px] font-black uppercase opacity-40 hover:opacity-100 py-2 text-center tracking-[0.18em]"
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
                  <div className="mb-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">
                      Acceso administrador
                    </p>
                    <h3 className="mt-2 text-xl sm:text-[1.45rem] font-black tracking-[-0.04em] uppercase text-black">
                      Ingreso seguro
                    </h3>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase ml-1 tracking-[0.16em] opacity-65">
                      Clave de Administrador
                    </label>

                    <div className="relative">
                      <input
                        autoFocus
                        type={verPassword ? "text" : "password"}
                        value={password}
                        onChange={manejarCambioPassword}
                        placeholder="••••••••"
                        className={`w-full mt-1.5 bg-[#f7f7f4] border-2 outline-none p-4 pr-12 rounded-[1.15rem] text-base md:text-[16px] font-bold transition-all shadow-sm ${
                          error.show
                            ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                            : "border-transparent focus:border-black"
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => setVerPassword(!verPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-black opacity-30 hover:opacity-100 transition-opacity p-1"
                        aria-label={
                          verPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
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
                    className="w-full bg-black text-white py-4 rounded-[1.15rem] font-black text-base md:text-lg shadow-[0_12px_26px_rgba(17,17,17,0.18)] hover:opacity-90 transition-all uppercase mt-2 disabled:opacity-60"
                  >
                    {submitting ? "INGRESANDO..." : "ACCEDER"}
                  </button>

                  <button
                    type="button"
                    onClick={irASeleccion}
                    className="w-full text-[10px] font-black uppercase opacity-40 hover:opacity-100 py-2 text-center tracking-[0.18em]"
                  >
                    ← Volver a roles
                  </button>
                </form>
              )}

              <div className="mt-8 sm:mt-10 pt-5 border-t border-black/5 text-[10px] opacity-35 font-bold uppercase tracking-[0.22em] text-center">
                Sistema de control interno
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;