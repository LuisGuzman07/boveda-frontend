import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  listPolicies: vi.fn(),
  updatePolicy: vi.fn(),
}));

vi.mock('../services/policyService', () => ({
  listPolicies: mocks.listPolicies,
  updatePolicy: mocks.updatePolicy,
}));

import SecurityPoliciesModal from './SecurityPoliciesModal';

const inactivityPolicy = {
  codigo: 'INACTIVITY_TIMEOUT_MINUTES',
  valor: 15,
  minimo: 1,
  maximo: 1440,
  version: 3,
  aplicada: true,
  descripcion: 'Minutos máximos de inactividad para sesiones web.',
};

describe('SecurityPoliciesModal', () => {
  beforeEach(() => {
    mocks.listPolicies.mockReset().mockResolvedValue([inactivityPolicy]);
    mocks.updatePolicy.mockReset();
  });

  it('validates integer input and sends the policy version with an authorized update', async () => {
    const onPoliciesChanged = vi.fn().mockResolvedValue(undefined);
    render(
      <SecurityPoliciesModal
        isOpen
        canWrite
        onClose={vi.fn()}
        onPoliciesChanged={onPoliciesChanged}
      />
    );

    const input = await screen.findByDisplayValue('15');
    fireEvent.change(input, { target: { value: '20' } });
    mocks.updatePolicy.mockResolvedValue({ ...inactivityPolicy, valor: 20, version: 4 });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(mocks.updatePolicy).toHaveBeenCalledWith('INACTIVITY_TIMEOUT_MINUTES', {
        valor: 20,
        version: 3,
      });
    });
    expect(onPoliciesChanged).toHaveBeenCalledTimes(1);
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
  });

  it('keeps read-only policies non-editable and closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <SecurityPoliciesModal isOpen canWrite={false} onClose={onClose} />
    );

    const input = await screen.findByDisplayValue('15');
    expect(input).toBeDisabled();
    expect(screen.getByText('Lectura autorizada')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
