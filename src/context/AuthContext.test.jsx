import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createApiTestHarness } from '../test/axiosTestUtils';

let harness;
let AuthProvider;
let useAuth;

function getHeader(config, name) {
  return (
    config.headers?.get?.(name) ||
    config.headers?.[name] ||
    config.headers?.[name.toLowerCase()]
  );
}

function AuthProbe() {
  const auth = useAuth();

  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="user">{auth.user?.nombre || 'none'}</span>
      <button type="button" onClick={() => auth.logout()}>
        Cerrar sesión
      </button>
    </div>
  );
}

function mockCookieSession() {
  harness.mock.onPost(harness.WEB_AUTH_ENDPOINTS.refresh).reply(200, {
    access_token: 'fresh-access-token',
  });
  harness.mock.onGet('/auth/me').reply(200, {
    user: { nombre: 'Ada Lovelace' },
    permissions: ['audit:read'],
  });
}

async function renderAuthenticatedProvider() {
  render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>
  );

  await waitFor(() => {
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
  });
}

beforeEach(async () => {
  harness = await createApiTestHarness();
  ({ AuthProvider, useAuth } = await import('./AuthContext'));
});

afterEach(() => {
  harness?.mock.restore();
});

describe('AuthProvider web sessions', () => {
  it('restores a cookie session into memory without retaining legacy tokens', async () => {
    const refreshRequests = [];
    const meRequests = [];

    localStorage.setItem('access_token', 'legacy-access-token');
    localStorage.setItem('refresh_token', 'legacy-refresh-token');
    document.cookie = 'csrf_token=csrf-value; path=/';
    harness.mock.onPost(harness.WEB_AUTH_ENDPOINTS.refresh).reply((config) => {
      refreshRequests.push(config);
      return [200, { access_token: 'fresh-access-token' }];
    });
    harness.mock.onGet('/auth/me').reply((config) => {
      meRequests.push(config);
      return [200, { user: { nombre: 'Ada Lovelace' }, permissions: ['audit:read'] }];
    });

    await renderAuthenticatedProvider();

    expect(screen.getByTestId('user')).toHaveTextContent('Ada Lovelace');
    expect(refreshRequests).toHaveLength(1);
    expect(refreshRequests[0].withCredentials).toBe(true);
    expect(getHeader(refreshRequests[0], 'X-CSRF-Token')).toBe('csrf-value');
    expect(getHeader(meRequests[0], 'Authorization')).toBe('Bearer fresh-access-token');
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('clears local authentication after a successful remote logout', async () => {
    const logoutRequests = [];

    mockCookieSession();
    harness.mock.onPost(harness.WEB_AUTH_ENDPOINTS.logout).reply((config) => {
      logoutRequests.push(config);
      return [204];
    });

    await renderAuthenticatedProvider();
    localStorage.setItem('access_token', 'legacy-access-token');
    localStorage.setItem('refresh_token', 'legacy-refresh-token');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });

    expect(logoutRequests).toHaveLength(1);
    expect(logoutRequests[0].withCredentials).toBe(true);
    expect(getHeader(logoutRequests[0], 'Authorization')).toBeUndefined();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('keeps local cleanup when remote logout fails', async () => {
    mockCookieSession();
    harness.mock.onPost(harness.WEB_AUTH_ENDPOINTS.logout).reply(500, {
      detail: 'Logout unavailable',
    });

    await renderAuthenticatedProvider();
    localStorage.setItem('access_token', 'legacy-access-token');
    localStorage.setItem('refresh_token', 'legacy-refresh-token');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });

    expect(harness.mock.history.post).toHaveLength(2);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });
});
