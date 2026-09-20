import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiTestHarness } from '../test/axiosTestUtils';

let harness;

function getHeader(config, name) {
  return (
    config.headers?.get?.(name) ||
    config.headers?.[name] ||
    config.headers?.[name.toLowerCase()]
  );
}

beforeEach(async () => {
  harness = await createApiTestHarness();
});

afterEach(() => {
  harness?.mock.restore();
});

describe('API authentication interceptors', () => {
  it('does not refresh or clear authentication after a 403 response', async () => {
    let accessToken = 'access-token';
    const unauthorizedHandler = vi.fn();

    harness.setAccessTokenProvider(() => accessToken);
    harness.setUnauthorizedHandler(unauthorizedHandler);
    harness.mock.onGet('/forbidden').reply(403, { detail: 'Forbidden' });
    harness.mock.onPost(harness.WEB_AUTH_ENDPOINTS.refresh).reply(200, {
      access_token: 'refreshed-token',
    });

    await expect(harness.api.get('/forbidden')).rejects.toMatchObject({
      response: { status: 403 },
    });

    expect(harness.mock.history.post).toHaveLength(0);
    expect(unauthorizedHandler).not.toHaveBeenCalled();
    expect(accessToken).toBe('access-token');
  });

  it('shares one refresh for concurrent 401 responses and retries each request once', async () => {
    let accessToken = 'expired-token';
    const refreshedTokenHandler = vi.fn((nextToken) => {
      accessToken = nextToken;
    });

    harness.setAccessTokenProvider(() => accessToken);
    harness.setRefreshedTokenHandler(refreshedTokenHandler);
    harness.mock.onPost(harness.WEB_AUTH_ENDPOINTS.refresh).reply(200, {
      access_token: 'refreshed-token',
    });
    harness.mock.onGet('/protected/one').reply((config) => {
      return getHeader(config, 'Authorization') === 'Bearer refreshed-token'
        ? [200, { resource: 'one' }]
        : [401];
    });
    harness.mock.onGet('/protected/two').reply((config) => {
      return getHeader(config, 'Authorization') === 'Bearer refreshed-token'
        ? [200, { resource: 'two' }]
        : [401];
    });

    const [first, second] = await Promise.all([
      harness.api.get('/protected/one'),
      harness.api.get('/protected/two'),
    ]);

    expect(first.data).toEqual({ resource: 'one' });
    expect(second.data).toEqual({ resource: 'two' });
    expect(harness.mock.history.post).toHaveLength(1);
    expect(harness.mock.history.get).toHaveLength(4);
    expect(refreshedTokenHandler).toHaveBeenCalledWith('refreshed-token');
  });

  it('cleans up after refresh failure without retrying the failed request', async () => {
    const unauthorizedHandler = vi.fn();

    harness.setAccessTokenProvider(() => 'expired-token');
    harness.setUnauthorizedHandler(unauthorizedHandler);
    harness.mock.onGet('/protected').reply(401, { detail: 'Expired token' });
    harness.mock.onPost(harness.WEB_AUTH_ENDPOINTS.refresh).reply(401, {
      detail: 'Refresh expired',
    });

    await expect(harness.api.get('/protected')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(harness.mock.history.get).toHaveLength(1);
    expect(harness.mock.history.post).toHaveLength(1);
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
    expect(unauthorizedHandler).toHaveBeenCalledWith('expired-token');
  });
});
