import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  auth: null,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

import ProtectedRoute from './ProtectedRoute';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mocks.auth = {
      isAuthenticated: false,
      isLocked: true,
      loading: false,
    };
  });

  it('unmounts protected content while an inactivity lock is displayed', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Contenido confidencial</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Inicio de sesión</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Inicio de sesión')).toBeInTheDocument();
    expect(screen.queryByText('Contenido confidencial')).not.toBeInTheDocument();
  });
});
