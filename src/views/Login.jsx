import React, { useMemo, useState } from "react";
import logo from "../assets/logo-blendfort.png";
import { useAppContext } from "../context/AppContext";

const normalize = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const Login = () => {
  // ✅ helpers del context (PASO 2 estable)
  const { login, personal, puedeIngresarComoResidente, getProyectosAsignados } = useAppContext();

  const [paso, setPaso] = useState("seleccion");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState({ show: false, msg: "" });
  const [verPassword, setVerPassword] = useState(false);

  const rolesPermitidos = useMemo(
    () =>
      new Set([
        "RESIDENTE",
        "INGENIERO",
        "INGENIERA",
        "ARQUITECTO",
        "ARQUITECTA",
        "ING",
        "ING.",
        "ARQ",
        "ARQ.",
      ]),
    []
  );

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

  const manejarCambioPassword = (e) => {
    setPassword(e.target.value);
    resetError();
  };

  const accesoResidente = (e) => {
    e.preventDefault();

    const nombreInput = String(nombre || "").trim();
    const passOk = password === "Blendfort2026";

    if (!nombreInput || !passOk) {
      setError({ show: true, msg: "CONTRASEÑA O NOMBRE INCORRECTO" });
      return;
    }

    const nombreN = normalize(nombreInput);

    // 1) Debe existir en Gestión Personal
    const emp = (personal || []).find((p) => normalize(p?.nombre) === nombreN);
    if (!emp) {
      setError({ show: true, msg: "NO ESTÁS REGISTRADO EN GESTIÓN PERSONAL" });
      return;
    }

    // 2) Rol permitido (NO depende de tipo oficina/campo)
    const rol = String(emp?.rol || "").toUpperCase().trim();
    if (!rolesPermitidos.has(rol)) {
      setError({ show: true, msg: "TU ROL NO TIENE ACCESO A RESIDENTE" });
      return;
    }

    // 3) Asignación a proyecto (✅ ÚNICA fuente de verdad: AppContext)
    const okAsignado = Boolean(puedeIngresarComoResidente?.(nombreInput));

    // Debug opcional (puedes dejarlo 1 día y luego borrarlo)
    // console.log("LOGIN DEBUG -> nombre:", nombreInput);
    // console.log("LOGIN DEBUG -> asignados:", getProyectosAsignados?.(nombreInput));

    if (!okAsignado) {
      setError({ show: true, msg: "NO TIENES PROYECTO ASIGNADO" });
      return;
    }

    // ✅ OK
    login("residente", nombreInput);
  };

  const accesoAdmin = (e) => {
    e.preventDefault();
    if (password === "Blendfortadmin") {
      login("admin", "Administrador");
    } else {
      setError({ show: true, msg: "CONTRASEÑA INCORRECTA" });
    }
  };

  return (
    <div className="min-h-screen bg-blendfort-fondo flex flex-col items-center justify-center p-6 text-black">
      <div className="bg-white w-full max-w-md rounded-3xl p-10 shadow-2xl text-center border border-black/5">
        <div className="mt-6 mb-8 flex justify-center">
          <img src={logo} alt="Logo Blendfort" className="h-44 w-auto object-contain" />
        </div>

        <h1 className="text-3xl font-black mb-1 tracking-tighter uppercase">BLENDFORT</h1>
        <p className="font-medium mb-10 opacity-60">Control de Egresos</p>

        {paso === "seleccion" && (
  <div className="space-y-5 animate-in fade-in duration-300">
    <button
      onClick={() => {
        setPaso("form_residente");
        setError({ show: false, msg: "" });
        setVerPassword(false);
        setPassword("");
      }}
      className="w-full bg-white text-black py-4 rounded-xl font-black text-lg border-2 border-blendfort-naranja transition-all duration-300 hover:bg-blendfort-naranja hover:text-white active:scale-95 shadow-sm uppercase"
    >
      {/* Mobile: RESIDENTE | Desktop: ENTRAR COMO RESIDENTE */}
      <span className="lg:hidden">RESIDENTE</span>
      <span className="hidden lg:inline">ENTRAR COMO RESIDENTE</span>
    </button>

    <button
      onClick={() => {
        setPaso("form_admin");
        setError({ show: false, msg: "" });
        setVerPassword(false);
        setPassword("");
      }}
      className="w-full bg-white text-black py-4 rounded-xl font-black text-lg border-2 border-black transition-all duration-300 hover:bg-black hover:text-white active:scale-95 shadow-sm uppercase"
    >
      {/* Mobile: ADMINISTRADOR | Desktop: ENTRAR COMO ADMINISTRADOR */}
      <span className="lg:hidden">ADMINISTRADOR</span>
      <span className="hidden lg:inline">ENTRAR COMO ADMINISTRADOR</span>
    </button>
  </div>
)}

        {paso === "form_residente" && (
          <form onSubmit={accesoResidente} className="space-y-4 text-left animate-in slide-in-from-right duration-300">
            <div>
              <label className="text-[10px] font-black uppercase ml-1 opacity-70">Nombre completo</label>
              <input
                autoFocus
                type="text"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  resetError();
                }}
                placeholder="Ej. Juan Pérez"
                className="w-full mt-1 bg-blendfort-fondo border-2 border-transparent focus:border-blendfort-naranja outline-none p-4 rounded-xl font-bold transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase ml-1 opacity-70">Contraseña</label>
              <div className="relative">
                <input
                  type={verPassword ? "text" : "password"}
                  value={password}
                  onChange={manejarCambioPassword}
                  placeholder="••••••••"
                  className={`w-full mt-1 bg-blendfort-fondo border-2 outline-none p-4 pr-12 rounded-xl font-bold transition-all ${
                    error.show
                      ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                      : "border-transparent focus:border-blendfort-naranja"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black opacity-30 hover:opacity-100 transition-opacity p-1"
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
              className="w-full bg-blendfort-naranja text-white py-4 rounded-xl font-black text-lg shadow-md hover:brightness-105 transition-all uppercase mt-2"
            >
              ACCEDER
            </button>

            <button
              type="button"
              onClick={() => {
                setPaso("seleccion");
                setPassword("");
                setError({ show: false, msg: "" });
              }}
              className="w-full text-[10px] font-black uppercase opacity-40 hover:opacity-100 py-2 text-center"
            >
              ← Volver a roles
            </button>
          </form>
        )}

        {paso === "form_admin" && (
          <form onSubmit={accesoAdmin} className="space-y-4 text-left animate-in slide-in-from-right duration-300">
            <div>
              <label className="text-[10px] font-black uppercase ml-1 opacity-70">Clave de Administrador</label>
              <div className="relative">
                <input
                  autoFocus
                  type={verPassword ? "text" : "password"}
                  value={password}
                  onChange={manejarCambioPassword}
                  placeholder="••••••••"
                  className={`w-full mt-1 bg-blendfort-fondo border-2 outline-none p-4 pr-12 rounded-xl font-bold transition-all ${
                    error.show
                      ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                      : "border-transparent focus:border-black"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black opacity-30 hover:opacity-100 transition-opacity p-1"
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
              className="w-full bg-black text-white py-4 rounded-xl font-black text-lg shadow-md hover:opacity-80 transition-all uppercase mt-2"
            >
              ACCEDER
            </button>

            <button
              type="button"
              onClick={() => {
                setPaso("seleccion");
                setPassword("");
                setError({ show: false, msg: "" });
              }}
              className="w-full text-[10px] font-black uppercase opacity-40 hover:opacity-100 py-2 text-center"
            >
              ← Volver a roles
            </button>
          </form>
        )}

        <div className="mt-12 text-[10px] opacity-30 font-bold uppercase tracking-widest">
          Sistema de Control Interno
        </div>
      </div>
    </div>
  );
};

export default Login;