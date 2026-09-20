import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  localStorage.clear();

  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.trim().split('=')[0];
    if (name) {
      document.cookie = `${name}=; expires=${new Date(0).toUTCString()}; path=/`;
    }
  });
});
