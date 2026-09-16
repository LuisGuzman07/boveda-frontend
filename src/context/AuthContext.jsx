import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, verifyLoginMfa, getMe, logoutUser } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        try {
          const userData = await getMe();
          setUser(userData);
          const userRoles = userData.roles?.map((r) => r.nombre) || [];
          const userPerms = userData.roles?.flatMap((r) => r.permisos?.map((p) => p.codigo)) || [];
          setRoles(userRoles);
          setPermissions([...new Set(userPerms)]);
        } catch (err) {
          console.error('Sesión inválida o expirada:', err);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (correo, password) => {
    const data = await loginUser(correo, password);
    if (data.mfa_required) {
      return data; // Requiere segundo paso (código 2FA)
    }
    _setAuthData(data);
    return data;
  };

  const completeMfaLogin = async (mfaToken, code) => {
    const data = await verifyLoginMfa(mfaToken, code);
    _setAuthData(data);
    return data;
  };

  const _setAuthData = (data) => {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setToken(data.access_token);
    setUser(data.usuario);
    setRoles(data.roles);
    setPermissions(data.permisos);
  };

  const register = async (nombre, correo, password) => {
    await registerUser(nombre, correo, password);
    return await login(correo, password);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    await logoutUser(refreshToken);
    setToken(null);
    setUser(null);
    setRoles([]);
    setPermissions([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        permissions,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        completeMfaLogin,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
