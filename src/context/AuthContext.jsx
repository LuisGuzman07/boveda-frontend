import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  getMe,
  loginUser,
  lockWebSessionForInactivity,
  logoutUser,
  refreshSession,
  registerUser,
  verifyLoginMfa,
} from '../services/authService';
import {
  setAccessTokenProvider,
  setRefreshedTokenHandler,
  setUnauthorizedHandler,
} from '../api/axios';

const AuthContext = createContext(null);

function removeLegacyStoredTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

function getStringValues(values, property) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => (typeof value === 'string' ? value : value?.[property]))
    .filter(Boolean);
}

function getAuthProfile(data) {
  const user = data?.usuario || data?.user || data;
  const roleSource = data?.roles || user?.roles || [];
  const directPermissions = data?.permisos ?? data?.permissions;
  const permissionSource = Array.isArray(directPermissions)
    ? directPermissions
    : roleSource.flatMap((role) => role?.permisos || role?.permissions || []);

  return {
    user,
    roles: getStringValues(roleSource, 'nombre'),
    permissions: [...new Set(getStringValues(permissionSource, 'codigo'))],
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [accessToken, setAccessToken] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const accessTokenRef = useRef(null);
  const sessionVersionRef = useRef(0);
  const inactivityLockRef = useRef(false);

  const updateAccessToken = (nextToken) => {
    const token = typeof nextToken === 'string' && nextToken ? nextToken : null;
    accessTokenRef.current = token;
    setAccessToken(token);
  };

  const clearAuthState = ({ locked = false } = {}) => {
    sessionVersionRef.current += 1;
    updateAccessToken(null);
    setUser(null);
    setRoles([]);
    setPermissions([]);
    setIsLocked(locked);
    inactivityLockRef.current = locked;
    removeLegacyStoredTokens();
  };

  const setAuthData = (data) => {
    if (!data?.access_token) {
      throw new Error('La respuesta de inicio de sesión no devolvió un token de acceso.');
    }

    sessionVersionRef.current += 1;
    inactivityLockRef.current = false;
    updateAccessToken(data.access_token);

    const profile = getAuthProfile(data);
    setUser(profile.user);
    setRoles(profile.roles);
    setPermissions(profile.permissions);
    setIsLocked(false);
  };

  useEffect(() => {
    setAccessTokenProvider(() => accessTokenRef.current);
    setRefreshedTokenHandler((nextToken) => {
      if (accessTokenRef.current) {
        updateAccessToken(nextToken);
      }
    });
    setUnauthorizedHandler((failedToken) => {
      if (!failedToken || failedToken === accessTokenRef.current) {
        clearAuthState();
      }
    });

    let active = true;
    removeLegacyStoredTokens();

    const restoreSession = async () => {
      const sessionVersion = sessionVersionRef.current;

      try {
        const refreshedToken = await refreshSession();
        if (!active || sessionVersion !== sessionVersionRef.current) {
          return;
        }

        updateAccessToken(refreshedToken);
        const userData = await getMe();
        if (!active || sessionVersion !== sessionVersionRef.current) {
          return;
        }

        const profile = getAuthProfile(userData);
        setUser(profile.user);
        setRoles(profile.roles);
        setPermissions(profile.permissions);
      } catch {
        if (active && sessionVersion === sessionVersionRef.current) {
          clearAuthState();
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      active = false;
      setAccessTokenProvider(null);
      setRefreshedTokenHandler(null);
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = async (correo, password) => {
    const data = await loginUser(correo, password);
    if (data.mfa_required) {
      return data; // Requiere segundo paso (código 2FA)
    }
    setAuthData(data);
    return data;
  };

  const completeMfaLogin = async (mfaToken, code) => {
    const data = await verifyLoginMfa(mfaToken, code);
    setAuthData(data);
    return data;
  };

  const register = async (nombre, correo, password) => {
    await registerUser(nombre, correo, password);
    return await login(correo, password);
  };

  const logout = async () => {
    clearAuthState();

    try {
      await logoutUser();
    } catch {
      // Local cleanup must still complete when the cookie cannot be revoked remotely.
    }
  };

  const lockForInactivity = async ({ notifyServer = true } = {}) => {
    if (inactivityLockRef.current) {
      return;
    }
    inactivityLockRef.current = true;

    const token = accessTokenRef.current;
    sessionVersionRef.current += 1;
    updateAccessToken(null);
    setUser(null);
    setRoles([]);
    setPermissions([]);
    setIsLocked(true);
    removeLegacyStoredTokens();

    if (notifyServer && token) {
      try {
        await lockWebSessionForInactivity(token);
      } catch {
        // The local lock remains mandatory even if a network failure delays server revocation.
      }
    }
  };

  const resumeFromInactivityLock = () => {
    setIsLocked(false);
    inactivityLockRef.current = false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        permissions,
        isAuthenticated: Boolean(user && accessToken && !isLocked),
        isLocked,
        loading,
        login,
        completeMfaLogin,
        register,
        logout,
        lockForInactivity,
        resumeFromInactivityLock,
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
