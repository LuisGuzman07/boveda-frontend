import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const authState = vi.hoisted(() => ({ permissions: [] }));
const auditService = vi.hoisted(() => ({
  getAuditEvents: vi.fn(),
  getAuditStats: vi.fn(),
  downloadAuditCsv: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../services/auditService', () => auditService);

import AuditPage from './AuditPage';

beforeEach(() => {
  vi.clearAllMocks();
  authState.permissions = ['audit:read'];
  auditService.getAuditEvents.mockResolvedValue({
    items: [],
    total: 0,
    total_pages: 1,
  });
  auditService.getAuditStats.mockResolvedValue({
    total_eventos: 0,
    eventos_exitosos: 0,
    eventos_fallidos: 0,
    eventos_denegados: 0,
  });
  auditService.downloadAuditCsv.mockResolvedValue();
});

describe('AuditPage permissions', () => {
  it('allows audit:read users to view events without exposing export', async () => {
    render(<AuditPage />);

    await screen.findByText('No se encontraron eventos registrados con los filtros aplicados.');

    expect(screen.getByRole('heading', { name: 'Bitácora de Auditoría' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /exportar csv/i })).not.toBeInTheDocument();
    expect(auditService.downloadAuditCsv).not.toHaveBeenCalled();
  });

  it('exposes and performs export only with audit:export', async () => {
    authState.permissions = ['audit:read', 'audit:export'];

    render(<AuditPage />);

    const exportButton = await screen.findByRole('button', { name: /exportar csv/i });
    await waitFor(() => expect(exportButton).toBeEnabled());
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(auditService.downloadAuditCsv).toHaveBeenCalledWith({});
    });
  });
});
