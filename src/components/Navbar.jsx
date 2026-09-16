import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, roles, permissions, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const canViewAudit = roles.includes('Administrador') || permissions.includes('audit:read');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          <span className="brand-icon">🛡️</span>
          <span className="brand-name">Bóveda Híbrida</span>
        </Link>

        <nav className="nav-menu">
          <Link to="/" className="nav-item">
            Inicio
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-item">
                Panel
              </Link>
              {canViewAudit && (
                <Link to="/audit" className="nav-item">
                  Auditoría
                </Link>
              )}
              <div className="nav-user-pill">
                <span className="nav-user-name">{user?.nombre?.split(' ')[0]}</span>
                {roles[0] && <span className="nav-role-badge">{roles[0]}</span>}
              </div>
              <button onClick={handleLogout} className="btn-logout">
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-nav-outline">
                Iniciar Sesión
              </Link>
              <Link to="/register" className="btn-nav-solid">
                Crear Cuenta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
