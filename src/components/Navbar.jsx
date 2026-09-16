import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, roles, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <span className="logo-icon">🛡️</span>
          <span className="logo-text">Bóveda Híbrida</span>
        </Link>

        <div className="nav-links">
          <Link to="/" className="nav-link">
            Inicio
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link highlight">
                Panel de Control
              </Link>
              <div className="user-nav-badge">
                <span className="user-name">{user?.nombre}</span>
                {roles[0] && <span className="role-tag">{roles[0]}</span>}
              </div>
              <button onClick={handleLogout} className="btn-nav-logout">
                Cerrar Sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-btn-secondary">
                Iniciar Sesión
              </Link>
              <Link to="/register" className="nav-btn-primary">
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
