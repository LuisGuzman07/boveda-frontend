import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PermissionRoute({ children, permission }) {
  const { isAuthenticated, loading, permissions } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Verificando credenciales...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // This is a UX gate only; the API must enforce the permission independently.
  if (!permissions.includes(permission)) {
    return (
      <section className="container access-denied">
        <div className="access-denied-card" role="alert">
          <span className="access-denied-code">403</span>
          <h2>Acceso restringido</h2>
          <p>No tienes permiso para consultar la bitácora de auditoría.</p>
          <Link to="/dashboard" className="btn btn-primary">
            Volver al panel
          </Link>
        </div>
      </section>
    );
  }

  return children;
}
