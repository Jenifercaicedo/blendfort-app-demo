import React from 'react';
import Login from './views/Login';
import ResidentDashboard from './views/ResidentDashboard';
import AdminDashboard from './views/AdminDashboard';
import { AppProvider, useAppContext } from './context/AppContext';

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

  return (
    <div className="min-h-screen bg-blendfort-fondo">
      {!usuario ? (
        <Login />
      ) : rol === 'RESIDENTE' ? (
        <ResidentDashboard />
      ) : rol === 'ADMIN' ? (
        <AdminDashboard />
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          Error de sesión
        </div>
      )}
    </div>
  );
}

export default App;