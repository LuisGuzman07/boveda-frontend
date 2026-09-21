import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  auth: null,
  channels: [],
  getEffectivePolicies: vi.fn(),
  lockForInactivity: vi.fn(),
}));

vi.mock('./AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('../services/policyService', () => ({
  getEffectivePolicies: mocks.getEffectivePolicies,
}));

import { InactivityProvider, useInactivity } from './InactivityContext';

function InactivityProbe() {
  const { timeoutMinutes, isWarning } = useInactivity();
  return (
    <div>
      <span data-testid="timeout">{timeoutMinutes}</span>
      <span data-testid="warning">{String(isWarning)}</span>
    </div>
  );
}

class BroadcastChannelStub {
  constructor(name) {
    this.name = name;
    this.onmessage = null;
    this.postMessage = vi.fn();
    this.close = vi.fn();
    mocks.channels.push(this);
  }
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function renderInactivityProvider() {
  return render(
    <MemoryRouter>
      <InactivityProvider>
        <InactivityProbe />
      </InactivityProvider>
    </MemoryRouter>
  );
}

describe('InactivityProvider', () => {
  let originalBroadcastChannel;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-20T12:00:00Z'));
    originalBroadcastChannel = globalThis.BroadcastChannel;
    globalThis.BroadcastChannel = BroadcastChannelStub;
    mocks.channels.length = 0;
    mocks.lockForInactivity.mockReset().mockResolvedValue(undefined);
    mocks.getEffectivePolicies.mockReset().mockResolvedValue({
      policies: { INACTIVITY_TIMEOUT_MINUTES: 1 },
    });
    mocks.auth = {
      isAuthenticated: true,
      isLocked: false,
      lockForInactivity: mocks.lockForInactivity,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.BroadcastChannel = originalBroadcastChannel;
  });

  it('warns, resets on user activity, and locks at the current policy timeout', async () => {
    renderInactivityProvider();
    await flushEffects();

    expect(screen.getByTestId('timeout')).toHaveTextContent('1');
    expect(mocks.getEffectivePolicies).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(48_000);
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).toHaveTextContent('se bloqueará por inactividad');

    fireEvent.pointerDown(window);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(59_000);
      await Promise.resolve();
    });
    expect(mocks.lockForInactivity).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(mocks.lockForInactivity).toHaveBeenCalledWith({ notifyServer: true });
    expect(mocks.channels[0].postMessage).toHaveBeenCalledWith({ type: 'lock' });
  });

  it('locks this tab without a duplicate server request after a cross-tab notification', async () => {
    renderInactivityProvider();
    await flushEffects();

    await act(async () => {
      mocks.channels[0].onmessage({ data: { type: 'lock' } });
      await Promise.resolve();
    });

    expect(mocks.lockForInactivity).toHaveBeenCalledWith({ notifyServer: false });
    expect(mocks.channels[0].postMessage).not.toHaveBeenCalled();
  });
});
