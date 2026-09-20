import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';

export async function createApiTestHarness() {
  vi.resetModules();

  // Configure Axios before the local clients are created so both instances use this adapter.
  const mock = new MockAdapter(axios, { onNoMatch: 'throwException' });
  const axiosModule = await import('../api/axios');

  return {
    api: axiosModule.default,
    mock,
    ...axiosModule,
  };
}
