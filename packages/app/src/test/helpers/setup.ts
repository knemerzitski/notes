import { loadErrorMessages, loadDevMessages } from '@apollo/client/dev';
import { cleanup } from '@testing-library/react';
import { beforeEach } from 'vitest';


if (import.meta.env.MODE !== 'production') {
  loadDevMessages();
  loadErrorMessages();
}

beforeEach(() => {
  cleanup();
});
